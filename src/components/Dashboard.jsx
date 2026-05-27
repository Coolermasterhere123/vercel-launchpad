'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Dashboard.module.css';

const FRAMEWORK_ICONS = {
  nextjs: '▲', react: '⚛', vue: '◈', nuxt: '◈', svelte: '◆',
  astro: '◎', remix: '◉', gatsby: '◍', vite: '⚡', angular: '◈',
  static: '◻', null: '◻',
};

const VIETNAM_PASSWORD = 'Webra2026';

function isVietnam(name) {
  return name?.toLowerCase().includes('vietnam');
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function frameworkIcon(fw) {
  return FRAMEWORK_ICONS[fw] || FRAMEWORK_ICONS.null;
}

// ─── Password Modal ───────────────────────────────────────────────
function PasswordModal({ project, onSuccess, onClose }) {
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const submit = () => {
    if (value === VIETNAM_PASSWORD) {
      onSuccess();
    } else {
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') onClose();
  };

  if (!project) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${shake ? styles.shake : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>🔒</div>
        <div className={styles.modalTitle}>{project.name}</div>
        <div className={styles.modalSub}>This project is password protected</div>
        <input
          ref={inputRef}
          type="password"
          className={styles.modalInput}
          placeholder="Enter password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
        />
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={submit}>Unlock ↗</button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Cards ───────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.card} style={{ pointerEvents: 'none' }}>
      <div className={styles.cardHeader}>
        <span className={`${styles.fwIcon} skeleton`} style={{ width: 28, height: 28, display: 'block' }} />
        <div className="skeleton" style={{ height: 18, width: '55%', borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ height: 13, width: '35%', borderRadius: 4, marginTop: 10 }} />
      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 30, flex: 1, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 30, flex: 1, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────
function ProjectCard({ project, onOpenVietnam, style }) {
  const locked = isVietnam(project.name);

  const handleShare = (project) => {
    const url = `${window.location.origin}/api/open?id=${project.id}`;
    if (navigator.share) {
      navigator.share({ title: project.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert(`Copied: ${url}`);
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    }
  };

  const handleOpen = (e) => {
    if (locked) {
      e.preventDefault();
      onOpenVietnam(project);
    }
  };

  return (
    <div className={`${styles.card} ${locked ? styles.cardLocked : ''}`} style={style}>
      <div className={styles.cardHeader}>
        <span className={styles.fwIcon}>{frameworkIcon(project.framework)}</span>
        <span className={styles.cardName}>{project.name}</span>
        {locked
          ? <span className={styles.lockIcon} title="Password protected">🔒</span>
          : <span className={styles.liveDot} title="Live" />
        }
      </div>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>updated</span>
          {timeAgo(project.updatedAt)}
        </span>
        {project.displayUrl && (
          <span className={styles.metaItem} title={project.displayUrl}>
            <span className={styles.metaLabel}>url</span>
            <span className={styles.urlPreview}>{project.displayUrl}</span>
          </span>
        )}
      </div>

      <div className={styles.cardActions}>
        {project.displayUrl ? (
          <a
            href={`/api/open?id=${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
            onClick={handleOpen}
          >
            {locked ? '🔒 Unlock' : 'Open ↗'}
          </a>
        ) : (
          <span className={styles.btnDisabled}>No URL</span>
        )}
        <button className={styles.btnSecondary} onClick={() => handleShare(project)}>
          Share
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('updated');
  const [pendingProject, setPendingProject] = useState(null); // awaiting password
  const [lastRefresh, setLastRefresh] = useState(null);
  const searchRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProjects(data.projects || []);
      setLastRefresh(Date.now());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // ── Back-button trap for PWA ──────────────────────────────────
    // Push a dummy history entry so the first "back" dismisses any
    // open overlay; if nothing is open it pushes forward again so
    // the app never exits to the OS home screen.
    if (typeof window !== 'undefined') {
      window.history.pushState({ launchpad: true }, '');

      const onPopState = (e) => {
        // Always push a new state so back never exits the PWA
        window.history.pushState({ launchpad: true }, '');
        // Close any open overlays instead
        setPendingProject(null);
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [fetchProjects]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setPendingProject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handlePasswordSuccess = () => {
    if (!pendingProject) return;
    const url = `/api/open?id=${pendingProject.id}`;
    setPendingProject(null);
    window.open(url, '_blank');
  };

  const filtered = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>◈</span>
            <span className={styles.logoText}>Launchpad</span>
          </div>
          {!loading && (
            <div className={styles.statsRow}>
              <span className={styles.stat}>
                <span className={styles.statDot} />
                {projects.length} live
              </span>
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              ref={searchRef}
              className={styles.search}
              placeholder="Search  /"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.sortRow}>
            {['updated', 'name'].map((s) => (
              <button key={s}
                className={`${styles.sortBtn} ${sort === s ? styles.sortActive : ''}`}
                onClick={() => setSort(s)}>{s}</button>
            ))}
          </div>
          <button className={styles.refreshBtn} onClick={fetchProjects} title="Refresh">↻</button>
        </div>
      </header>

      {lastRefresh && (
        <div className={styles.ticker}>
          <span className={styles.tickerDot} />
          {projects.length} projects · refreshed {timeAgo(lastRefresh)}
        </div>
      )}

      <main className={styles.main}>
        {error ? (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠</div>
            <div className={styles.errorMsg}>{error}</div>
            <button className={styles.btnPrimary} onClick={fetchProjects}>Retry</button>
          </div>
        ) : loading ? (
          <div className={styles.grid}>
            {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {search ? `No projects matching "${search}"` : 'No live projects found.'}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpenVietnam={setPendingProject}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              />
            ))}
          </div>
        )}
      </main>

      <PasswordModal
        project={pendingProject}
        onSuccess={handlePasswordSuccess}
        onClose={() => setPendingProject(null)}
      />
    </div>
  );
}
