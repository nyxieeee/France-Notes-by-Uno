import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanDeckTitle, downloadName, MAX_DOWNLOAD_NAME_LENGTH, normalizeDownloadFilename } from './fileNames.ts'

test('filenames use spaces and preserve the export type and extension', () => {
  assert.equal(downloadName('Chronic_Kidney_Disease.pdf', 'Study Guide', 'PDF'), 'Chronic Kidney Disease - Study Guide.pdf')
  assert.equal(downloadName('Heart Failure - Slides', 'Slides', 'pptx'), 'Heart Failure - Slides.pptx')
  assert.equal(downloadName('Doc Uno: **Hypertension**', null, 'docx'), 'Hypertension.docx')
  assert.equal(cleanDeckTitle('AI PPTX \u2014 [Reference] Heart Failure.docx'), 'Heart Failure')
})

test('long titles fit the length budget without dropping the format label', () => {
  for (const ext of ['pdf', 'docx', 'pptx']) {
    for (const title of ['Nursing priorities and interventions for cardiovascular conditions '.repeat(8), 'A'.repeat(300), '\u00e9'.repeat(200)]) {
      const result = downloadName(title, 'Study Guide', ext)
      assert.ok(Array.from(result).length <= MAX_DOWNLOAD_NAME_LENGTH)
      assert.ok(result.endsWith(` - Study Guide.${ext}`))
      assert.equal(normalizeDownloadFilename(result), result)
    }
  }
})

test('every raw download filename is normalized at the download boundary', () => {
  assert.equal(normalizeDownloadFilename('My__Study_Notes.PDF'), 'My Study Notes.pdf')
  assert.equal(normalizeDownloadFilename('Nursing\nNotes.docx'), 'Nursing Notes.docx')
  for (const input of ['___', '..', '**', '', 'CON', 'NUL', 'LPT1', 'bad / : * ? " < > | name']) {
    const result = downloadName(input, null, 'pdf')
    assert.ok(!/[_\\/:*?"<>|]/.test(result))
    assert.ok(!/^(con|nul|lpt1)\.pdf$/i.test(result))
    assert.ok(result.endsWith('.pdf'))
    assert.ok(result.length <= MAX_DOWNLOAD_NAME_LENGTH)
  }
  assert.equal(downloadName('', null, 'pdf'), 'France Notes.pdf')
  assert.equal(downloadName('R\u00e9sum\u00e9 des soins', null, 'docx'), 'R\u00e9sum\u00e9 des soins.docx')
})
