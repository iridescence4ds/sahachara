import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 24, marginBottom: 10, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, marginTop: 20, marginBottom: 10, fontWeight: 'bold' },
  text: { fontSize: 12, lineHeight: 1.5, marginBottom: 10 },
  chunk: { marginBottom: 15 },
  chunkHeader: { fontSize: 10, color: '#666', marginBottom: 5 },
  link: { color: 'blue', textDecoration: 'none' },
});

// Helper to parse synthesis and wikilinks
const renderSynthesisWithLinks = (text) => {
  if (!text) return null;
  const paragraphs = text.split('\n');
  return paragraphs.map((p, i) => {
    if (p.startsWith('## ')) {
      return <Text key={i} style={styles.sectionTitle}>{p.replace('## ', '')}</Text>;
    }
    if (p.startsWith('### ')) {
      return <Text key={i} style={{ ...styles.sectionTitle, fontSize: 16 }}>{p.replace('### ', '')}</Text>;
    }
    if (!p.trim()) return null;

    const parts = p.split(/\[\[(.*?)\]\]/g);
    return (
      <Text key={i} style={styles.text}>
        {parts.map((part, j) => {
          if (j % 2 === 1) { // Inside brackets
            // Create a Google Search link for the wikilink entity
            return (
              <Link key={j} src={`https://www.google.com/search?q=${encodeURIComponent(part)}`} style={styles.link}>
                {part}
              </Link>
            );
          }
          return part.replace(/\*\*(.*?)\*\*/g, '$1');
        })}
      </Text>
    );
  });
};

export const TranscriptPDF = ({ data, chunks }) => {
  const title = data?.title || "Untitled Transcript";
  const synthesis = data?.knowledge_synthesis || "";

  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        
        {synthesis && (
          <View>
            <Text style={{ ...styles.sectionTitle, fontSize: 20 }}>Knowledge Synthesis</Text>
            {renderSynthesisWithLinks(synthesis)}
          </View>
        )}

        <View break>
          <Text style={{ ...styles.sectionTitle, fontSize: 20 }}>Transcript Segments</Text>
          {chunks && chunks.map((r, i) => (
            <View key={i} wrap={false} style={styles.chunk}>
              <Text style={styles.chunkHeader}>
                Chunk {r.chunk.chunk_index} ({r.chunk.startTime_str} - {r.chunk.endTime_str})
                {r.chunk.speakers?.length > 0 ? ` • ${r.chunk.speakers.join(", ")}` : ""}
              </Text>
              <Text style={styles.text}>{r.chunk.content}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
