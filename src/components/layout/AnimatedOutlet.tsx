import { useLocation, useOutlet } from 'react-router-dom'

/** Key by page only: edits and query-string changes never remount an editor. */
export default function AnimatedOutlet() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  return <div key={pathname} className="fn-route-enter flex flex-col flex-1 min-h-0">{outlet}</div>
}
