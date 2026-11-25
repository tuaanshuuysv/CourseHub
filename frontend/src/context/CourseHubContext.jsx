import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setStoredToken } from '@/api/client';

const CourseHubContext = createContext(null);

// Hook truy cap trang thai dung chung cua ung dung CourseHub
export function useCourseHub() {
  const ctx = useContext(CourseHubContext);
  if (!ctx) throw new Error('useCourseHub must be used within CourseHubProvider');
  return ctx;
}

// Tai khoan demo nhanh cho 3 vai tro phuc vu trinh dien do an
const ROLE_CREDENTIALS = {
  Student: { email: 'user@demo.com', password: '123456' },
  Educator: { email: 'educator@coursehub.io', password: '123456' },
  Admin: { email: 'admin@coursehub.io', password: '123456' },
};

const EMPTY_STREAK = { currentStreak: 0, longestStreak: 0, activeDates: [] };

export function CourseHubProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [streak, setStreak] = useState(EMPTY_STREAK);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [cartIds, setCartIds] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const toastTimerRef = useRef(null);

  // Hien thi thong bao nhanh (toast) va tu dong an sau 3 giay
  const notify = useCallback((message, tone = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  // Don dep bo dem thong bao khi component bi huy
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Tai danh sach danh muc va khoa hoc cong khai tu backend
  const refreshPublicCatalog = useCallback(async () => {
    try {
      const [catRes, courseRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/courses?limit=50'),
      ]);
      setCategories(Array.isArray(catRes) ? catRes : []);
      setCourses(courseRes?.courses || []);
    } catch {
      // Bo qua loi khi backend chua mount public routes o giai doan dau
    }
  }, []);

  // Dong bo trang thai yeu thich, gio hang va khoa hoc da mua cua hoc vien
  const refreshStudentState = useCallback(async (userRole) => {
    if (!userRole || userRole === 'admin') {
      setWishlistIds([]);
      setCartIds([]);
      setEnrolledIds([]);
      return;
    }
    try {
      const [wishRes, cartRes, myRes] = await Promise.all([
        api.get('/api/student/wishlist'),
        api.get('/api/student/cart'),
        api.get('/api/student/my-courses'),
      ]);
      setWishlistIds((wishRes || []).map((c) => c._id));
      setCartIds((cartRes || []).map((c) => c._id));
      setEnrolledIds((myRes?.courses || []).map((c) => c._id));
      if (myRes?.streak) setStreak(myRes.streak);
    } catch {
      // Bo qua neu vai tro hien tai chua co du lieu hoc vien
    }
  }, []);

  // Khoi phuc phien dang nhap hien tai khi tai lai trang
  useEffect(() => {
    let active = true;
    (async () => {
      await refreshPublicCatalog();
      try {
        const me = await api.get('/api/auth/me');
        if (!active) return;
        setCurrentUser(me.user);
        if (me.streak) setStreak(me.streak);
        await refreshStudentState(me.user.role);
      } catch {
        if (!active) return;
        setCurrentUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshPublicCatalog, refreshStudentState]);

  // Dang nhap bang email va mat khau
  const signIn = useCallback(
    async ({ email, password }) => {
      const res = await api.post('/api/auth/login', { email, password });
      setStoredToken(res.token);
      setCurrentUser(res.user);
      await refreshStudentState(res.user.role);
      notify(`Signed in as ${res.user.name} (${res.user.role})`);
      return res.user;
    },
    [notify, refreshStudentState]
  );

  // Dang nhap nhanh bang tai khoan Google (OAuth demo)
  const signInWithGoogle = useCallback(async () => {
    const res = await api.post('/api/auth/google', { email: 'user@demo.com', name: 'Nguyen Tuan Huy' });
    setStoredToken(res.token);
    setCurrentUser(res.user);
    await refreshStudentState(res.user.role);
    notify('Signed in with Google');
    return res.user;
  }, [notify, refreshStudentState]);

  // Chuyen doi nhanh giua 3 vai tro demo (Student, Educator, Admin)
  const switchRole = useCallback(
    async (roleLabel) => {
      const creds = ROLE_CREDENTIALS[roleLabel] || ROLE_CREDENTIALS.Student;
      try {
        const res = await api.post('/api/auth/login', creds);
        setStoredToken(res.token);
        setCurrentUser(res.user);
        await refreshStudentState(res.user.role);
        notify(`Switched to ${res.user.name} (${roleLabel})`);
      } catch (err) {
        notify(err.message, 'danger');
      }
    },
    [notify, refreshStudentState]
  );

  // Dang xuat va don sach trang thai phien lam viec o client
  const signOut = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Van xoa phien cuc bo ngay ca khi ket noi backend bi gian doan
    } finally {
      setStoredToken(null);
      setCurrentUser(null);
      setStreak(EMPTY_STREAK);
      setWishlistIds([]);
      setCartIds([]);
      setEnrolledIds([]);
      notify('Signed out of CourseHub', 'info');
    }
  }, [notify]);

  // Bat tat trang thai yeu thich cua mot khoa hoc
  const toggleWishlist = useCallback(
    async (courseId) => {
      if (!currentUser) {
        notify('Please sign in to save courses', 'danger');
        return;
      }
      try {
        const res = await api.post('/api/student/wishlist/toggle', { courseId });
        setWishlistIds((prev) =>
          res.wished ? [...new Set([...prev, courseId])] : prev.filter((id) => id !== courseId)
        );
        notify(res.message);
      } catch (err) {
        notify(err.message, 'danger');
      }
    },
    [currentUser, notify]
  );

  // Them khoa hoc vao gio hang
  const addToCart = useCallback(
    async (courseId) => {
      if (!currentUser) {
        notify('Please sign in to add courses to cart', 'danger');
        return;
      }
      try {
        const res = await api.post('/api/student/cart', { courseId });
        setCartIds((prev) => [...new Set([...prev, courseId])]);
        notify(res.message);
      } catch (err) {
        notify(err.message, 'info');
      }
    },
    [currentUser, notify]
  );

  // Xoa khoa hoc khoi gio hang
  const removeFromCart = useCallback(
    async (courseId) => {
      try {
        await api.delete(`/api/student/cart/${courseId}`);
        setCartIds((prev) => prev.filter((id) => id !== courseId));
        notify('Removed from cart', 'info');
      } catch (err) {
        notify(err.message, 'danger');
      }
    },
    [notify]
  );

  const value = useMemo(
    () => ({
      authReady,
      currentUser,
      setCurrentUser,
      streak,
      setStreak,
      courses,
      categories,
      wishlistIds,
      cartIds,
      enrolledIds,
      refreshPublicCatalog,
      refreshStudentState,
      signIn,
      signInWithGoogle,
      switchRole,
      signOut,
      toggleWishlist,
      addToCart,
      removeFromCart,
      toast,
      notify,
    }),
    [
      authReady,
      currentUser,
      streak,
      courses,
      categories,
      wishlistIds,
      cartIds,
      enrolledIds,
      refreshPublicCatalog,
      refreshStudentState,
      signIn,
      signInWithGoogle,
      switchRole,
      signOut,
      toggleWishlist,
      addToCart,
      removeFromCart,
      toast,
      notify,
    ]
  );

  return <CourseHubContext.Provider value={value}>{children}</CourseHubContext.Provider>;
}
