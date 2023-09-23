const UIIcon = (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgb(165 243 252)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="9" x2="9" y1="21" y2="9" />
  </svg>
)

const LayoutIcon = (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgb(233 213 255)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </svg>
)

export function OG({
  title,
  description,
  isUI
}: {
  isUI: boolean
  title: string
  description: string
}) {
  const mutedForeground = 'rgb(209 213 219)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '3.5rem',
        justifyContent: 'space-between',
        background: 'hsl(0 0% 3.9%)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: '3rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '0.75rem',
            border: `1px rgba(156,163,175,0.3)`,
            borderRadius: '0.75rem',
            background: `linear-gradient(to bottom, black, ${
              isUI ? 'rgb(0,50,150)' : 'rgb(150,50,150)'
            })`
          }}
        >
          {isUI ? UIIcon : LayoutIcon}
        </div>

        <p
          style={{
            color: mutedForeground,
            fontWeight: 700,
            marginLeft: '1.5rem',
            fontSize: '2.3rem'
          }}
        >
          {isUI ? 'Next Docs UI' : 'Next Docs Zeta'}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem',
          border: '1px rgba(156,163,175,0.3)',
          borderRadius: '1.5rem',
          background:
            'linear-gradient(to top, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'
        }}
      >
        <p
          style={{
            color: 'white',
            fontWeight: 700,
            fontSize: '3.75rem'
          }}
        >
          {title}
        </p>
        <p
          style={{
            color: mutedForeground,
            fontWeight: 500,
            fontSize: '2rem'
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}
