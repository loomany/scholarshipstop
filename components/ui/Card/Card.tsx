import { ReactNode } from 'react';

interface Props {
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  /** Premium sign-in / auth surfaces: softer border, more padding, calmer shadow. */
  variant?: 'default' | 'auth';
}

export default function Card({
  title,
  description,
  footer,
  children,
  variant = 'default'
}: Props) {
  const isAuth = variant === 'auth';

  return (
    <div
      className={
        isAuth
          ? 'm-auto my-6 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-[0_6px_28px_-8px_rgba(0,0,0,0.08)]'
          : 'm-auto my-8 w-full max-w-3xl rounded-lg border border-zinc-200 bg-white shadow-sm'
      }
    >
      <div className={isAuth ? 'px-8 py-9 sm:px-9 sm:py-10' : 'px-5 py-4'}>
        {title ? (
          <h3
            className={
              isAuth
                ? `text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl${description ? '' : ' mb-8'}`
                : 'mb-1 text-2xl font-medium text-zinc-900'
            }
          >
            {title}
          </h3>
        ) : null}
        {description ? (
          <p
            className={
              isAuth
                ? 'mb-8 mt-3 max-w-none text-left text-base leading-relaxed text-zinc-600 sm:leading-relaxed'
                : 'text-zinc-600'
            }
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {footer && (
        <div
          className={
            isAuth
              ? 'rounded-b-2xl border-t border-zinc-100 bg-zinc-50/80 p-5 text-zinc-600'
              : 'rounded-b-lg border-t border-zinc-200 bg-zinc-50 p-4 text-zinc-600'
          }
        >
          {footer}
        </div>
      )}
    </div>
  );
}
