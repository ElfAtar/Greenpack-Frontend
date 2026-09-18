import React from 'react'
import { highlightMatches } from '../utils/search'

interface HighlightedTextProps {
  text: string
  query: string
}

/** Renders text with the part matching the query marked, so a hit is visible at a glance. */
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => (
  <>
    {highlightMatches(text, query).map((segment, index) => (
      segment.match
        ? <mark key={index} style={{ background: '#fff3b0', color: 'inherit', padding: 0 }}>{segment.text}</mark>
        : <React.Fragment key={index}>{segment.text}</React.Fragment>
    ))}
  </>
)

export default HighlightedText
