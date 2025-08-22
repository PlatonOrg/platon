import { Tab, Tabs } from 'nextra/components'
import React, { useMemo, useRef, useEffect } from 'react'
import { useBaseUrl } from '../../hooks/useBaseUrl'
import { buildAbsoluteUrl } from '../../hooks'

interface PlaygroundItem {
  name: string
  url: string
}

interface PlaygroundProps {
  items: PlaygroundItem[]
  height?: string
  width?: string
}

export const Playground: React.FC<PlaygroundProps> = ({ items, height = '700px', width = '100%' }) => {
  const baseUrl = useBaseUrl()
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([])

  // Filter out .ple URLs when the base URL is not '/' (e.g. GitHub Pages)
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (item.url.endsWith('.ple') && baseUrl.includes('github')) {
          return false
        }
        return true
      })
      .map((item) => ({
        ...item,
        url: buildAbsoluteUrl(baseUrl, item.url),
      }))
  }, [items, baseUrl])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'resize') {
        iframeRefs.current.forEach((iframe) => {
          if (iframe?.contentWindow === event.source) {
            iframe.style.height = `${event.data.height}px`
          }
        })
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (filteredItems.length === 0) {
    return <div>No playground items available</div>
  }

  return (
    <Tabs items={filteredItems.map((item) => item.name)}>
      {filteredItems.map((item, index) => (
        <Tab key={index}>
          <iframe
            ref={(el) => (iframeRefs.current[index] = el)}
            src={item.url}
            style={{ width, height, border: 'none' }}
            title={item.name}
          />
        </Tab>
      ))}
    </Tabs>
  )
}
