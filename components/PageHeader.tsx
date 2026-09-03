import Link from 'next/link';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <>
      <div className="eyebrow">{eyebrow} <span className="pulse" /> MOCK FEED ACTIVE</div>
      <div className="title-row">
        <div><h1>{title}</h1><p>{description}</p></div>
        {action && <Link className="primary-button" href={action.href}>{action.label}</Link>}
      </div>
    </>
  );
}
