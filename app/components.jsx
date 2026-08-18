import Link from 'next/link';
export function Stamp({state='BOUND'}){return <span className={`stamp ${state.toLowerCase().replace(' ','-')}`}>{state}</span>}
export function Docket({id,state='BOUND',children}){return <article className="docket"><div className="docket-top"><code>{id}</code><Stamp state={state}/></div>{children}</article>}
export function PageHead({eyebrow,title,children}){return <section className="page-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section>}
export function Empty({children,href='/coverage',label='Browse available policies →'}){return <div className="empty"><p>{children}</p>{href&&<Link className="text-link" href={href}>{label}</Link>}</div>}
