import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaEnvelope, FaShoppingBag, FaTag, FaTimes, FaTrash } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Tinh gia ban thuc te cua mot khoa hoc co ap dung gia khuyen mai hop le
function getEffectivePrice(course) {
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  return hasDiscount ? course.discountPrice : course.price;
}

// Man hinh gio hang, kiem tra ma giam gia va thanh toan don hang (UC-3.3, UC-3.4)
export default function MyCartPage() {
  const { removeFromCart, refreshStudentState, currentUser, notify } = useCourseHub();
  const [cartItems, setCartItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const items = await api.get('/api/student/cart');
        if (!active) return;
        const safeItems = Array.isArray(items) ? items : [];
        setCartItems(safeItems);
        setSelectedIds(safeItems.map((i) => i._id));
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedItems = cartItems.filter((c) => selectedIds.includes(c._id));
  const subtotal = selectedItems.reduce((sum, c) => sum + getEffectivePrice(c), 0);
  const discount = appliedCoupon ? Math.min(subtotal, Math.round((subtotal * appliedCoupon.discountPercent) / 100)) : 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      notify('Please enter a coupon code', 'danger');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await api.post('/api/student/coupons/validate', { code });
      setAppliedCoupon(res.coupon);
      setCouponInput(res.coupon.code);
      notify(`Applied coupon ${res.coupon.code} (${res.coupon.discountPercent}% off)`);
    } catch (err) {
      setAppliedCoupon(null);
      notify(err.message, 'danger');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (selectedIds.length === 0) return;
    setSubmittingOrder(true);
    try {
      const res = await api.post('/api/student/checkout', {
        courseIds: selectedIds,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod: total === 0 ? 'free' : paymentMethod,
      });
      await refreshStudentState(currentUser?.role);
      setOrderResult({ order: res.order, emailSent: Boolean(res.emailSent) });
      setCartItems((prev) => prev.filter((c) => !selectedIds.includes(c._id)));
      setSelectedIds([]);
      setAppliedCoupon(null);
      notify(res.message);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleRemove = async (courseId) => {
    await removeFromCart(courseId);
    setCartItems((prev) => prev.filter((c) => c._id !== courseId));
    setSelectedIds((prev) => prev.filter((x) => x !== courseId));
  };

  return (
    <WorkspaceLayout
      variant="student"
      title="My Cart & Checkout"
      subtitle="Review selected courses, apply promo codes, and complete your enrollment."
    >
      {orderResult ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <FaCheckCircle size={46} style={{ color: 'var(--success)', marginBottom: 12 }} />
          <h2>Enrollment Confirmed!</h2>
          <p style={{ color: 'var(--ink-muted)', maxWidth: 480, margin: '8px auto 12px' }}>
            Order <strong>#{String(orderResult.order._id).slice(-6).toUpperCase()}</strong> completed via{' '}
            <strong>{String(orderResult.order.paymentMethod || '').toUpperCase()}</strong> (Total:{' '}
            <strong>${Number(orderResult.order.totalAmount || 0).toFixed(2)}</strong>).
          </p>
          {orderResult.emailSent && currentUser?.email && (
            <div
              className="ch-badge ch-badge--teal"
              style={{ marginBottom: 18, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <FaEnvelope /> Payment confirmation email sent to {currentUser.email}
            </div>
          )}
          <div>
            <button type="button" onClick={() => navigate('/student/my-courses')} className="ch-btn ch-btn--primary">
              Go to My Courses
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading your cart...
        </div>
      ) : cartItems.length === 0 ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <FaShoppingBag size={36} style={{ color: 'var(--teal)', marginBottom: 12 }} />
          <h3>Your cart is empty</h3>
          <p style={{ color: 'var(--ink-muted)' }}>Explore our catalog and add courses to begin learning.</p>
          <Link to="/student/courses" className="ch-btn ch-btn--primary" style={{ marginTop: 8 }}>
            Browse Courses
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.85fr', gap: 24, alignItems: 'start' }}>
          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>{cartItems.length} Courses in Cart</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cartItems.map((item) => {
                const price = getEffectivePrice(item);
                const checked = selectedIds.includes(item._id);
                return (
                  <div
                    key={item._id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px 115px 1fr auto',
                      gap: 14,
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== item._id) : [...prev, item._id]
                        )
                      }
                    />
                    <img
                      src={item.thumbnail || '/media/courses/01.jpg'}
                      alt={item.title}
                      style={{ width: 115, height: 70, objectFit: 'cover', borderRadius: 10 }}
                    />
                    <div>
                      <span className="ch-badge ch-badge--teal">{item.category?.name || 'General'}</span>
                      <Link to={`/student/courses/${item._id}`} style={{ display: 'block', fontWeight: 700, marginTop: 6 }}>
                        {item.title}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                        By {item.instructor?.name || 'Instructor'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--teal-dark)' }}>
                        {price === 0 ? 'Free' : `$${price}`}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item._id)}
                        className="ch-btn ch-btn--sm ch-btn--danger-soft"
                        style={{ marginTop: 8 }}
                      >
                        <FaTrash size={11} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Order Summary</h2>
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                className="ch-input"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Enter promo code"
              />
              <button type="submit" disabled={applyingCoupon} className="ch-btn ch-btn--outline">
                {applyingCoupon ? '...' : 'Apply'}
              </button>
            </form>

            {appliedCoupon && (
              <div
                className="ch-badge ch-badge--teal"
                style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <FaTag /> Applied: {appliedCoupon.code} ({appliedCoupon.discountPercent}% OFF)
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  title="Remove coupon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex' }}
                >
                  <FaTimes size={11} />
                </button>
              </div>
            )}

            <div className="ch-field" style={{ marginBottom: 16 }}>
              <label className="ch-label">Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'vnpay', label: 'VNPay QR' },
                  { id: 'momo', label: 'MoMo Wallet' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`ch-btn ch-btn--sm ${paymentMethod === pm.id ? 'ch-btn--primary' : 'ch-btn--outline'}`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: '0.92rem',
                paddingBottom: 14,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Subtotal ({selectedItems.length} items)</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Coupon Discount</span>
                <strong style={{ color: 'var(--coral)' }}>-${discount.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
              <span style={{ fontWeight: 700 }}>Total Due</span>
              <strong style={{ fontSize: '1.65rem', fontFamily: 'var(--font-display)', color: 'var(--teal-dark)' }}>
                ${total.toFixed(2)}
              </strong>
            </div>

            <button
              type="button"
              disabled={selectedItems.length === 0 || submittingOrder}
              onClick={handleCheckout}
              className="ch-btn ch-btn--coral ch-btn--lg"
              style={{ width: '100%' }}
            >
              {submittingOrder
                ? 'Processing Order...'
                : total === 0
                  ? 'Complete Free Enrollment'
                  : `Place Order via ${paymentMethod.toUpperCase()}`}
            </button>
          </aside>
        </div>
      )}
    </WorkspaceLayout>
  );
}
