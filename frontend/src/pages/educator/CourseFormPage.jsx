import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaCheckCircle,
  FaImage,
  FaPlus,
  FaQuestionCircle,
  FaTrash,
  FaUpload,
  FaVideo,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

// Sinh ma dinh danh cuc bo on dinh cho tung phan tu trong bieu mau
function makeUid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Khoi tao mot cau hoi trac nghiem moi trong bai giang
function createEmptyQuestion() {
  return {
    uid: makeUid(),
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

// Khoi tao mot bai giang moi trong chuong hoc
function createEmptyLecture(index = 1) {
  return {
    uid: makeUid(),
    title: `Lecture ${index}`,
    videoUrl: '',
    duration: 600,
    isFree: index === 1,
    uploading: false,
    quizOpen: false,
    questions: [],
  };
}

// Khoi tao mot chuong hoc moi trong giao trinh
function createEmptySection(index = 1) {
  return {
    uid: makeUid(),
    section: `Module ${index}: Core Curriculum`,
    lectures: [createEmptyLecture(1)],
  };
}

// Doc thoi luong video (giay) tu tep truoc khi tai len de tu dien thoi luong bai giang
function readVideoDurationSec(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      const sec = Number.isFinite(videoEl.duration) ? Math.max(1, Math.round(videoEl.duration)) : null;
      URL.revokeObjectURL(objectUrl);
      resolve(sec);
    };
    videoEl.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    videoEl.src = objectUrl;
  });
}

// Man hinh tao khoa hoc moi kem upload anh bia, upload video bai giang va trinh soan trac nghiem
export default function CourseFormPage() {
  const navigate = useNavigate();
  const { currentUser, categories, notify, refreshPublicCatalog } = useCourseHub();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [language, setLanguage] = useState('English / Vietnamese');
  const [duration, setDuration] = useState(12);
  const [durationUnit, setDurationUnit] = useState('HOUR');
  const [price, setPrice] = useState(79);
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountPrice, setDiscountPrice] = useState(49);
  const [status, setStatus] = useState('Pending');
  const [thumbnail, setThumbnail] = useState('/media/courses/01.jpg');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [objectives, setObjectives] = useState(['']);
  const [sections, setSections] = useState([createEmptySection(1)]);
  const [submitting, setSubmitting] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive !== false),
    [categories]
  );

  useEffect(() => {
    if (!categoryId && activeCategories.length > 0) {
      setCategoryId(activeCategories[0]._id);
    }
  }, [categoryId, activeCategories]);

  const selectedCategoryName =
    activeCategories.find((c) => c._id === categoryId)?.name || 'General';

  const totalLecturesCount = sections.reduce((sum, sec) => sum + sec.lectures.length, 0);
  const totalQuestionsCount = sections.reduce(
    (sum, sec) => sum + sec.lectures.reduce((ls, l) => ls + l.questions.length, 0),
    0
  );
  const isAnyVideoUploading = sections.some((sec) => sec.lectures.some((l) => l.uploading));

  // Tai len anh bia khoa hoc qua API /api/instructor/thumbnails/upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file (JPG, PNG, WEBP, GIF)', 'danger');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      notify('Thumbnail image must be 5MB or smaller', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('thumbnail', file);
    setUploadingThumb(true);
    try {
      const res = await api.upload('/api/instructor/thumbnails/upload', formData);
      setThumbnail(res.imageUrl);
      notify(res.message || 'Thumbnail uploaded');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setUploadingThumb(false);
    }
  };

  // Cap nhat thong tin mot bai giang cu the trong chuong
  const updateLecture = (sectionUid, lectureUid, updater) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.uid !== sectionUid) return sec;
        return {
          ...sec,
          lectures: sec.lectures.map((lec) =>
            lec.uid === lectureUid ? (typeof updater === 'function' ? updater(lec) : { ...lec, ...updater }) : lec
          ),
        };
      })
    );
  };

  // Dao thu tu bai giang len hoac xuong trong cung mot chuong (quiz gan kem tu di chuyen theo)
  const moveLecture = (sectionUid, lectureIdx, direction) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.uid !== sectionUid) return sec;
        const targetIdx = lectureIdx + direction;
        if (targetIdx < 0 || targetIdx >= sec.lectures.length) return sec;
        const nextLectures = [...sec.lectures];
        const temp = nextLectures[lectureIdx];
        nextLectures[lectureIdx] = nextLectures[targetIdx];
        nextLectures[targetIdx] = temp;
        return { ...sec, lectures: nextLectures };
      })
    );
  };

  // Tai len video bai giang qua API /api/instructor/videos/upload (tu luu DraftVideo)
  const handleLectureVideoUpload = async (sectionUid, lectureUid, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      notify('Only MP4, WebM, and MOV video files are allowed', 'danger');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      notify('Video file must be 200MB or smaller', 'danger');
      return;
    }

    const detectedDuration = await readVideoDurationSec(file);
    updateLecture(sectionUid, lectureUid, { uploading: true });

    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await api.upload('/api/instructor/videos/upload', formData);
      updateLecture(sectionUid, lectureUid, (lec) => ({
        ...lec,
        videoUrl: res.videoUrl,
        duration: detectedDuration || lec.duration,
        uploading: false,
      }));
      notify(res.message || 'Lecture video uploaded');
    } catch (err) {
      updateLecture(sectionUid, lectureUid, { uploading: false });
      notify(err.message, 'danger');
    }
  };

  // Kiem tra du lieu va gui yeu cau tao khoa hoc moi
  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedPrice = Number(price);
    const parsedDiscount = Number(discountPrice);
    if (!title.trim()) {
      notify('Course title is required', 'danger');
      return;
    }
    if (!categoryId) {
      notify('Please select a course category', 'danger');
      return;
    }
    if (enableDiscount && parsedDiscount > parsedPrice) {
      notify('Discount price cannot exceed original price', 'danger');
      return;
    }

    // Chuan hoa giao trinh va kiem tra tung cau hoi trac nghiem
    const curriculumPayload = [];
    for (let sIdx = 0; sIdx < sections.length; sIdx += 1) {
      const sec = sections[sIdx];
      if (!sec.section.trim()) {
        notify(`Section #${sIdx + 1} title is required`, 'danger');
        return;
      }
      if (sec.lectures.length === 0) {
        notify(`Section "${sec.section}" must contain at least one lecture`, 'danger');
        return;
      }

      const lecPayloads = [];
      for (let lIdx = 0; lIdx < sec.lectures.length; lIdx += 1) {
        const lec = sec.lectures[lIdx];
        if (!lec.title.trim()) {
          notify(`Lecture #${lIdx + 1} in "${sec.section}" requires a title`, 'danger');
          return;
        }

        const qPayloads = [];
        for (let qIdx = 0; qIdx < lec.questions.length; qIdx += 1) {
          const q = lec.questions[qIdx];
          const trimmedOptions = q.options.map((o) => o.trim()).filter(Boolean);
          const selectedOpt = (q.options[q.correctIndex] || '').trim();
          if (!q.question.trim() || trimmedOptions.length < 2 || !trimmedOptions.includes(selectedOpt)) {
            notify(
              `Quiz question #${qIdx + 1} in "${lec.title}" needs question text, at least 2 options, and a valid correct answer`,
              'danger'
            );
            return;
          }
          qPayloads.push({
            question: q.question.trim(),
            options: trimmedOptions,
            correctAnswer: selectedOpt,
            explanation: q.explanation.trim(),
          });
        }

        lecPayloads.push({
          title: lec.title.trim(),
          videoUrl: lec.videoUrl || '/media/videos/720p.mp4',
          duration: Math.max(0, Number(lec.duration) || 600),
          isFree: Boolean(lec.isFree),
          questions: qPayloads,
        });
      }

      curriculumPayload.push({
        section: sec.section.trim(),
        order: sIdx + 1,
        lectures: lecPayloads,
      });
    }

    const cleanObjectives = objectives.map((o) => o.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim() || subtitle.trim(),
      categoryId,
      level,
      language: language.trim() || 'English / Vietnamese',
      duration: Math.max(0, Number(duration) || 0),
      durationUnit,
      price: Math.max(0, parsedPrice),
      enableDiscount: Boolean(enableDiscount),
      discountPrice: enableDiscount ? Math.max(0, parsedDiscount) : Math.max(0, parsedPrice),
      thumbnail,
      image: thumbnail,
      previewVideo: curriculumPayload[0]?.lectures[0]?.videoUrl || '/media/videos/720p.mp4',
      status,
      objectives: cleanObjectives,
      curriculum: curriculumPayload,
    };

    setSubmitting(true);
    try {
      const res = await api.post('/api/instructor/courses', payload);
      await refreshPublicCatalog();
      notify(res.message || 'Course created successfully');
      navigate(`/instructor/courses/${res.course._id}`);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const previewPrice = enableDiscount && Number(discountPrice) < Number(price) ? Number(discountPrice) : Number(price);

  return (
    <WorkspaceLayout
      variant="educator"
      title="Create New Course"
      subtitle="Upload course thumbnail and lecture videos, organize sections, and attach quizzes to any lecture."
      actions={
        <Link to="/instructor/courses" className="ch-btn ch-btn--sm ch-btn--outline">
          <FaArrowLeft /> Back to Courses
        </Link>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 0.7fr', gap: 22, alignItems: 'start' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Phan 1: Thong tin co ban, gia va anh bia */}
          <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>1. Basic Information & Thumbnail</h2>

            <div className="ch-field">
              <label className="ch-label">Course Title</label>
              <input
                className="ch-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack MERN Architecture"
                required
              />
            </div>

            <div className="ch-field">
              <label className="ch-label">Short Subtitle</label>
              <input
                className="ch-input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="One-sentence summary of what students will build..."
              />
            </div>

            <div className="ch-field">
              <label className="ch-label">Full Description</label>
              <textarea
                className="ch-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain course prerequisites, projects, and outcomes..."
              />
            </div>

            <div className="ch-grid-3">
              <div className="ch-field">
                <label className="ch-label">Category</label>
                <select className="ch-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  {activeCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ch-field">
                <label className="ch-label">Level</label>
                <select className="ch-select" value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All">All</option>
                </select>
              </div>

              <div className="ch-field">
                <label className="ch-label">Submission Status</label>
                <select className="ch-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Pending">Submit for Review (Pending)</option>
                  <option value="Draft">Save as Draft</option>
                </select>
              </div>
            </div>

            <div className="ch-grid-3">
              <div className="ch-field">
                <label className="ch-label">Language</label>
                <input className="ch-input" value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <div className="ch-field">
                <label className="ch-label">Estimated Duration</label>
                <input
                  type="number"
                  min={0}
                  className="ch-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="ch-field">
                <label className="ch-label">Duration Unit</label>
                <select className="ch-select" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                  <option value="HOUR">Hours</option>
                  <option value="MINUTE">Minutes</option>
                  <option value="DAY">Days</option>
                </select>
              </div>
            </div>

            <div className="ch-grid-2" style={{ alignItems: 'end' }}>
              <div className="ch-field">
                <label className="ch-label">Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  className="ch-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="ch-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={enableDiscount}
                    onChange={(e) => setEnableDiscount(e.target.checked)}
                  />
                  Enable Discount Price
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={!enableDiscount}
                  className="ch-input"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  placeholder="Discounted price"
                />
              </div>
            </div>

            <div className="ch-field">
              <label className="ch-label">Course Cover Thumbnail (JPG/PNG/WEBP, max 5MB)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label className="ch-btn ch-btn--sm ch-btn--outline" style={{ cursor: uploadingThumb ? 'wait' : 'pointer' }}>
                  <FaImage /> {uploadingThumb ? 'Uploading Thumbnail...' : 'Upload Cover Image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploadingThumb}
                    onChange={handleThumbnailUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{thumbnail}</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="ch-label" style={{ margin: 0 }}>Learning Objectives</label>
                <button
                  type="button"
                  onClick={() => setObjectives((prev) => [...prev, ''])}
                  className="ch-btn ch-btn--sm ch-btn--outline"
                >
                  <FaPlus size={10} /> Add Objective
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {objectives.map((obj, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="ch-input"
                      value={obj}
                      onChange={(e) =>
                        setObjectives((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
                      }
                      placeholder="e.g. Architect scalable REST APIs with Express and MongoDB"
                    />
                    {objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setObjectives((prev) => prev.filter((_, i) => i !== idx))}
                        className="ch-btn ch-btn--sm ch-btn--danger-soft"
                      >
                        <FaTrash size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phan 2: Giao trinh da chuong, upload video va soan cau hoi trac nghiem gan theo bai giang */}
          <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>2. Curriculum, Videos & Lecture Quizzes</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                  Attach quiz questions directly to any lecture to place a quiz right after that video.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSections((prev) => [...prev, createEmptySection(prev.length + 1)])}
                className="ch-btn ch-btn--sm ch-btn--outline"
              >
                <FaPlus size={10} /> Add Section
              </button>
            </div>

            {sections.map((sec, sIdx) => (
              <div
                key={sec.uid}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    className="ch-input"
                    value={sec.section}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((item) => (item.uid === sec.uid ? { ...item, section: e.target.value } : item))
                      )
                    }
                    placeholder={`Section ${sIdx + 1} title`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSections((prev) =>
                        prev.map((item) =>
                          item.uid === sec.uid
                            ? { ...item, lectures: [...item.lectures, createEmptyLecture(item.lectures.length + 1)] }
                            : item
                        )
                      )
                    }
                    className="ch-btn ch-btn--sm ch-btn--primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <FaPlus size={10} /> Lecture
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSections((prev) => prev.filter((item) => item.uid !== sec.uid))}
                      className="ch-btn ch-btn--sm ch-btn--danger-soft"
                      title="Remove section"
                    >
                      <FaTrash size={11} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sec.lectures.map((lec, lIdx) => (
                    <div
                      key={lec.uid}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--teal-dark)' }}>
                          Lecture #{lIdx + 1}
                        </strong>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={lIdx === 0}
                            onClick={() => moveLecture(sec.uid, lIdx, -1)}
                            className="ch-btn ch-btn--sm ch-btn--outline"
                            title="Move lecture up"
                          >
                            <FaArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            disabled={lIdx === sec.lectures.length - 1}
                            onClick={() => moveLecture(sec.uid, lIdx, 1)}
                            className="ch-btn ch-btn--sm ch-btn--outline"
                            title="Move lecture down"
                          >
                            <FaArrowDown size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLecture(sec.uid, lec.uid, { quizOpen: !lec.quizOpen })}
                            className={`ch-btn ch-btn--sm ${lec.quizOpen || lec.questions.length > 0 ? 'ch-btn--primary' : 'ch-btn--outline'}`}
                          >
                            <FaQuestionCircle size={11} /> Quiz ({lec.questions.length})
                          </button>
                          {sec.lectures.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSections((prev) =>
                                  prev.map((item) =>
                                    item.uid === sec.uid
                                      ? { ...item, lectures: item.lectures.filter((x) => x.uid !== lec.uid) }
                                      : item
                                  )
                                )
                              }
                              className="ch-btn ch-btn--sm ch-btn--danger-soft"
                              title="Remove lecture"
                            >
                              <FaTrash size={10} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'center' }}>
                        <input
                          className="ch-input"
                          value={lec.title}
                          onChange={(e) => updateLecture(sec.uid, lec.uid, { title: e.target.value })}
                          placeholder="Lecture title"
                          required
                        />
                        <input
                          type="number"
                          min={0}
                          className="ch-input"
                          value={lec.duration}
                          onChange={(e) => updateLecture(sec.uid, lec.uid, { duration: Number(e.target.value) })}
                          title="Duration in seconds"
                          placeholder="Sec"
                        />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={lec.isFree}
                            onChange={(e) => updateLecture(sec.uid, lec.uid, { isFree: e.target.checked })}
                          />
                          Free Preview
                        </label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <label
                          className="ch-btn ch-btn--sm ch-btn--outline"
                          style={{ cursor: lec.uploading ? 'wait' : 'pointer' }}
                        >
                          <FaUpload size={11} />{' '}
                          {lec.uploading
                            ? 'Uploading Video...'
                            : lec.videoUrl
                              ? 'Replace Video'
                              : 'Upload Lecture Video (MP4/WebM/MOV)'}
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            disabled={lec.uploading}
                            onChange={(e) => handleLectureVideoUpload(sec.uid, lec.uid, e)}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {lec.videoUrl ? (
                          <span className="ch-badge ch-badge--teal">
                            <FaVideo size={10} /> Video attached
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                            Default sample video will be used if none uploaded
                          </span>
                        )}
                      </div>

                      {lec.videoUrl && (
                        <video
                          key={lec.videoUrl}
                          controls
                          style={{ width: '100%', maxHeight: 200, borderRadius: 10, background: '#09090b' }}
                        >
                          <source src={lec.videoUrl} type="video/mp4" />
                        </video>
                      )}

                      {lec.quizOpen && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: 12,
                            borderRadius: 10,
                            background: 'var(--bg-canvas)',
                            border: '1px dashed var(--teal)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: '0.84rem' }}>
                              Lecture Quiz Builder ({lec.questions.length} questions)
                            </strong>
                            <button
                              type="button"
                              onClick={() =>
                                updateLecture(sec.uid, lec.uid, (item) => ({
                                  ...item,
                                  questions: [...item.questions, createEmptyQuestion()],
                                }))
                              }
                              className="ch-btn ch-btn--sm ch-btn--outline"
                            >
                              <FaPlus size={10} /> Add Question
                            </button>
                          </div>

                          {lec.questions.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                              No quiz questions attached to this lecture yet. Click Add Question to create one.
                            </div>
                          ) : (
                            lec.questions.map((q, qIdx) => (
                              <div
                                key={q.uid}
                                style={{
                                  padding: 10,
                                  borderRadius: 10,
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Question #{qIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateLecture(sec.uid, lec.uid, (item) => ({
                                        ...item,
                                        questions: item.questions.filter((x) => x.uid !== q.uid),
                                      }))
                                    }
                                    className="ch-btn ch-btn--sm ch-btn--danger-soft"
                                  >
                                    <FaTrash size={10} />
                                  </button>
                                </div>

                                <input
                                  className="ch-input"
                                  value={q.question}
                                  onChange={(e) =>
                                    updateLecture(sec.uid, lec.uid, (item) => ({
                                      ...item,
                                      questions: item.questions.map((x) =>
                                        x.uid === q.uid ? { ...x, question: e.target.value } : x
                                      ),
                                    }))
                                  }
                                  placeholder="Enter quiz question prompt..."
                                />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                                    Select the radio button next to the correct option:
                                  </div>
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <input
                                        type="radio"
                                        name={`correct-${q.uid}`}
                                        checked={q.correctIndex === oIdx}
                                        onChange={() =>
                                          updateLecture(sec.uid, lec.uid, (item) => ({
                                            ...item,
                                            questions: item.questions.map((x) =>
                                              x.uid === q.uid ? { ...x, correctIndex: oIdx } : x
                                            ),
                                          }))
                                        }
                                        title="Mark as correct answer"
                                      />
                                      <input
                                        className="ch-input"
                                        value={opt}
                                        onChange={(e) =>
                                          updateLecture(sec.uid, lec.uid, (item) => ({
                                            ...item,
                                            questions: item.questions.map((x) =>
                                              x.uid === q.uid
                                                ? {
                                                    ...x,
                                                    options: x.options.map((oVal, idx2) =>
                                                      idx2 === oIdx ? e.target.value : oVal
                                                    ),
                                                  }
                                                : x
                                            ),
                                          }))
                                        }
                                        placeholder={`Option ${oIdx + 1}`}
                                      />
                                    </div>
                                  ))}
                                </div>

                                <input
                                  className="ch-input"
                                  value={q.explanation}
                                  onChange={(e) =>
                                    updateLecture(sec.uid, lec.uid, (item) => ({
                                      ...item,
                                      questions: item.questions.map((x) =>
                                        x.uid === q.uid ? { ...x, explanation: e.target.value } : x
                                      ),
                                    }))
                                  }
                                  placeholder="Optional explanation shown after checking answers..."
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || uploadingThumb || isAnyVideoUploading}
              className="ch-btn ch-btn--coral ch-btn--lg"
            >
              <FaCheckCircle /> {submitting ? 'Creating Course...' : 'Submit Course'}
            </button>
          </div>
        </form>

        {/* The xem truoc khoa hoc truc tiep */}
        <aside className="ch-card ch-card--pad" style={{ position: 'sticky', top: 84 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--teal)', marginBottom: 10 }}>
            LIVE CATALOG PREVIEW
          </div>
          <div className="ch-course-card">
            <div className="ch-course-card__media">
              <img src={thumbnail || '/media/courses/01.jpg'} alt="Course cover preview" />
            </div>
            <div className="ch-course-card__body">
              <span className="ch-badge ch-badge--teal">
                {selectedCategoryName} | {level}
              </span>
              <div className="ch-course-card__title">{title || 'Your Course Title Appears Here'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                By {currentUser?.name || 'Educator'} | {sections.length} sections | {totalLecturesCount} lectures
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
                {totalQuestionsCount} attached quiz questions
              </div>
            </div>
            <div className="ch-course-card__footer">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <strong style={{ fontSize: '1.2rem', color: 'var(--teal-dark)' }}>
                  {previewPrice === 0 ? 'Free' : `$${previewPrice || 0}`}
                </strong>
                {enableDiscount && Number(discountPrice) < Number(price) && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textDecoration: 'line-through' }}>
                    ${price}
                  </span>
                )}
              </div>
              <span className="ch-badge ch-badge--amber">{status}</span>
            </div>
          </div>
        </aside>
      </div>
    </WorkspaceLayout>
  );
}
