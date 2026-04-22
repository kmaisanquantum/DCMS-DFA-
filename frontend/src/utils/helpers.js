import { format, formatDistanceToNow, isPast } from 'date-fns';

export const fmt = (d, pattern = 'dd MMM yyyy') =>
  d ? format(new Date(d), pattern) : '—';

export const fmtDateTime = (d) =>
  d ? format(new Date(d), 'dd MMM yyyy HH:mm') : '—';

export const timeAgo = (d) =>
  d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—';

export const isOverdue = (request) =>
  ['UNDER_REVIEW', 'SUBMITTED'].includes(request.status) &&
  request.review_deadline &&
  isPast(new Date(request.review_deadline));

export const rowColor = (request) => {
  if (['CLEARANCE_ISSUED', 'ALL_APPROVED'].includes(request.status))
    return { border: 'var(--green)', bg: 'var(--green-dim)' };
  if (isOverdue(request))
    return { border: 'var(--red)', bg: 'var(--red-dim)' };
  return { border: 'var(--yellow)', bg: 'var(--yellow-dim)' };
};

export const statusLabel = {
  DRAFT:            { label: 'Draft',             color: 'var(--text-muted)',   bg: 'var(--bg-elevated)' },
  SUBMITTED:        { label: 'Submitted',          color: 'var(--blue-text)',    bg: 'var(--blue-dim)' },
  UNDER_REVIEW:     { label: 'Under Review',       color: 'var(--yellow-text)',  bg: 'var(--yellow-dim)' },
  ALL_APPROVED:     { label: '✓ All Approved',     color: 'var(--green-text)',   bg: 'var(--green-dim)' },
  CLEARANCE_ISSUED: { label: '✓ Clearance Issued', color: 'var(--green-text)',   bg: 'var(--green-dim)' },
  REJECTED:         { label: '✕ Rejected',         color: 'var(--red-text)',     bg: 'var(--red-dim)' },
  WITHDRAWN:        { label: 'Withdrawn',          color: 'var(--text-muted)',   bg: 'var(--bg-elevated)' },
  EXPIRED:          { label: 'Expired',            color: 'var(--red-text)',     bg: 'var(--red-dim)' },
};

export const reviewStatusLabel = {
  PENDING:              { label: 'Pending',              color: 'var(--yellow-text)', bg: 'var(--yellow-dim)' },
  APPROVED:             { label: '✓ Approved',           color: 'var(--green-text)',  bg: 'var(--green-dim)' },
  REJECTED:             { label: '✕ Rejected',           color: 'var(--red-text)',    bg: 'var(--red-dim)' },
  INFORMATION_REQUESTED:{ label: 'Info Requested',       color: 'var(--blue-text)',   bg: 'var(--blue-dim)' },
};

export const vesselTypeLabel = (t) =>
  (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
