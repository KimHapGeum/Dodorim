import { useEffect, useMemo, useRef, useState } from 'react';
import { alert } from '../dialog';
import { clickable } from '../a11y';

// 강의 등록(addition) / 수정(revise) 화면이 함께 쓰는 편집 UI
// 강의 = 설명(강의 목록과 강의 첫 화면에 보임) + 슬라이드 1, 2, 3... (각 슬라이드 = 글 + 사진·영상 여러 개)

// 강의 설명 입력 (서버 posts.description, 5000자까지)
export function LectureDescription({ value, onChange }) {
  return (
    <div className="input-group">
      <label>강의 설명 (선택)</label>
      <textarea
        className="text-input"
        style={{ height: '110px', resize: 'none', fontFamily: 'inherit' }}
        maxLength={5000}
        placeholder="강의 목록과 강의 첫 화면에 보일 설명을 입력하세요 (비워 두면 첫 화면 없이 슬라이드부터 시작)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      ></textarea>
    </div>
  );
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)$/i;
export const isVideo = (file) => file.type?.startsWith('video/') || VIDEO_EXT.test(file.name || '');
const isMedia = (file) => file.type?.startsWith('image/') || isVideo(file);

// 선택한 File들의 미리보기 URL (화면에서 사라지면 해제)
function usePreviewUrls(files) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);
  return urls;
}


// 배경(overlay)을 직접 눌렀을 때만 닫히는 모달
function Modal({ onClose, children, busy }) {
  return (
    <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} disabled={busy} aria-label="닫기"><i className="fa-solid fa-xmark"></i></button>
        {children}
      </div>
    </div>
  );
}

const modalTitle = { marginBottom: '20px', fontSize: '18px', fontWeight: 700, color: '#1e293b' };

function ModalButtons({ edit, onClose, onComplete, label, busy }) {
  return (
    <div style={{ display: 'flex', gap: '15px' }}>
      <button className="btn btn-back" style={{ borderRadius: '12px' }} onClick={onClose} disabled={busy}>
        <i className="fa-solid fa-arrow-left"></i> {edit ? '취소' : '이전 단계로'}
      </button>
      <button className="btn btn-next" style={{ borderRadius: '12px' }} onClick={onComplete} disabled={busy}>{label}</button>
    </div>
  );
}

const thumbBox = { position: 'relative', width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: '#1e293b', flexShrink: 0 };
const thumbX = { position: 'absolute', top: '3px', right: '3px', width: '22px', height: '22px', border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: '11px' };

function Thumb({ url, video, onRemove }) {
  return (
    <div style={thumbBox}>
      {video
        ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><i className="fa-solid fa-play"></i></div>
        : <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <button type="button" style={thumbX} onClick={onRemove} title="빼기"><i className="fa-solid fa-xmark"></i></button>
    </div>
  );
}

/*
 * 슬라이드 작성 모달: 글 + 사진·영상 여러 개 (클릭 또는 드래그 앤 드롭)
 * initial: { text, files: File[] (새 파일), media: [{ name, type, url }] (서버에 이미 있는 파일) }
 * onDeleteMedia(name): 서버 파일 삭제 (수정 화면에서만)
 * progress: 저장(업로드) 중이면 진행률 %, 아니면 null — 저장 중에는 버튼을 막음
 */
export function SlideModal({ no, initial, edit, onDeleteMedia, onClose, onComplete, progress = null }) {
  const [text, setText] = useState(initial?.text || '');
  const [files, setFiles] = useState(initial?.files || []);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef(null);
  const previews = usePreviewUrls(files);
  const media = initial?.media || [];

  const addFiles = (list) => {
    const picked = [...(list || [])];
    if (picked.some((f) => !isMedia(f))) alert('사진 또는 동영상 파일만 추가할 수 있습니다.');
    setFiles((prev) => [...prev, ...picked.filter(isMedia)]);
  };

  const complete = () => {
    if (!text.trim() && !files.length && !media.length) { alert('글을 쓰거나 사진·동영상을 추가해주세요.'); return; }
    onComplete({ text: text.trim(), files });
  };

  return (
    <Modal onClose={onClose} busy={progress !== null}>
      <h3 style={modalTitle}>슬라이드 {no}</h3>

      <textarea
        className="text-input"
        style={{ height: '110px', marginBottom: '15px', resize: 'none', fontFamily: 'inherit' }}
        placeholder="이 슬라이드에서 설명할 글을 입력하세요 (음성 안내로 읽어 줍니다)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>

      <input type="file" ref={fileRef} multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <div
        className={`content-file-box ${dragover ? 'dragover' : ''}`}
        style={{ width: '100%', height: '120px', marginBottom: '15px' }}
        {...clickable(() => fileRef.current.click())}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => { e.preventDefault(); setDragover(false); addFiles(e.dataTransfer.files); }}
      >
        <i className="fa-solid fa-cloud-arrow-up"></i>
        <span>사진 또는 동영상 파일을 끌어다 놓거나 클릭하여 추가하세요 (여러 개 가능)</span>
      </div>

      {(media.length > 0 || files.length > 0) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {media.map((m) => <Thumb key={m.url} url={m.url} video={m.type === 'video'} onRemove={() => onDeleteMedia(m.name)} />)}
          {files.map((f, i) => <Thumb key={previews[i]} url={previews[i]} video={isVideo(f)} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}
        </div>
      )}

      <ModalButtons
        edit={edit}
        onClose={onClose}
        onComplete={complete}
        busy={progress !== null}
        label={progress !== null ? `업로드 중... ${progress}%` : edit ? '저장' : '추가하기'}
      />
    </Modal>
  );
}

// 슬라이드 카드 썸네일: 첫 번째 사진(없으면 영상/빈 아이콘)
function SlideThumb({ url, video }) {
  if (url && !video) return <img src={url} className="item-img" />;
  return (
    <div className="item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: video ? '#1e293b' : '#f1f5f9', color: video ? '#fff' : '#cbd5e1' }}>
      <i className={`fa-solid ${video ? 'fa-play' : 'fa-align-left'}`} style={{ fontSize: '26px' }}></i>
    </div>
  );
}

/*
 * 슬라이드 카드 + 추가 버튼 그리드
 * slides: [{ text, thumb: { url, video } | null, imageCount, videoCount }]
 * onMoveSlide(index, -1 | 1): 슬라이드를 앞/뒤로 한 칸 옮김
 */
export function SlideGrid({ slides, onAddSlide, onEditSlide, onDeleteSlide, onMoveSlide }) {
  return (
    <div className="inner-content">
      {slides.map((s, index) => (
        <div className="item-card" key={index}>
          <div className="card-actions">
            {[-1, 1].map((dir) => (
              <div
                key={dir}
                className="action-icon-btn move-btn"
                style={{ visibility: (dir < 0 ? index > 0 : index < slides.length - 1) ? 'visible' : 'hidden' }}
                {...clickable(() => onMoveSlide(index, dir))}
                aria-label={`슬라이드 ${index + 1}을 ${dir < 0 ? '앞으로' : '뒤로'} 옮기기`}
                title={dir < 0 ? '앞으로' : '뒤로'}
              >
                <i className={`fa-solid fa-arrow-${dir < 0 ? 'left' : 'right'}`}></i>
              </div>
            ))}
            <div className="action-icon-btn edit-btn" {...clickable(() => onEditSlide(index))} aria-label={`슬라이드 ${index + 1} 수정`}><i className="fa-solid fa-pen"></i></div>
            <div className="action-icon-btn delete-btn" {...clickable(() => onDeleteSlide(index))} aria-label={`슬라이드 ${index + 1} 삭제`}><i className="fa-solid fa-trash"></i></div>
          </div>
          <div className="item-badge badge-image">슬라이드 {index + 1}</div>
          <SlideThumb url={s.thumb?.url} video={s.thumb?.video} />
          <div className="item-title">사진 {s.imageCount} · 영상 {s.videoCount}</div>
          <div className="item-desc">{s.text || '글이 입력되지 않았습니다.'}</div>
        </div>
      ))}

      <div className="add-btn content-add-more" {...clickable(onAddSlide)} title="슬라이드 추가" aria-label="슬라이드 추가"><i className="fa-solid fa-plus"></i></div>
    </div>
  );
}
