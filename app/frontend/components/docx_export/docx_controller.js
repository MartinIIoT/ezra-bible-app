/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const docx = require('docx');
const { marked } = require('marked');
const docxHelper = require('./docx_helper.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const { parseHTML } = require('../../helpers/ezra_helper.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');

/**
 * The docxController implements the generation of a Word document with certain verses with notes or tags.
 * docxController.generateDocument gets called from exportController.
 * Paragraph and heading styles for the generated Word document as well as some other helpful functions located in docxHelper.
 *
 * @category Controller
 */

module.exports.generateDocument = async function(title, verses, mode, bibleBooks=undefined, notes={}) {

  var children = [];

  // Tagged verse list
  if (mode === 'tagged-verses' && bibleBooks && Array.isArray(bibleBooks)) {
    children.push(...docxHelper.markdownToDocx(`# ${title}`));

    for (const currentBook of bibleBooks) {
      const bookTitle = await i18nHelper.getSwordTranslation(currentBook.longTitle);
      const allBlocks = getBibleBookVerseBlocks(currentBook, verses);
      const blockParagraphs = await renderVerseBlocks(allBlocks, mode, currentBook, notes);

      if (blockParagraphs.length > 0) {
        children.push(
          new docx.Paragraph({
            text: bookTitle,
            heading: docx.HeadingLevel.HEADING_2,
          }),
          ...blockParagraphs
        );
      }
    }

  } else if (mode === 'book-notes') { // Book-based notes
    const titleP = new docx.Paragraph({
      text: title,
      heading: docx.HeadingLevel.TITLE
    });

    const allBlocks = getBookBlockByChapter(verses);
    const chapterParagraphs = await renderVerseBlocks(allBlocks, mode, undefined, notes);
    children.push(titleP, ...chapterParagraphs);

  } else if (mode === 'tagged-verses-with-notes') {
    const titleP = new docx.Paragraph({
      text: title,
      heading: docx.HeadingLevel.TITLE
    });

    const introduction = notes.introduction ? docxHelper.markdownToDocx(notes.introduction + '\n\n') : [];
    const conclusion = notes.conclusion ? docxHelper.markdownToDocx(notes.conclusion) : [];

    const allBlocks = getBookBlockByChapter(verses);
    const verseParagraphs = await renderVerseBlocks(allBlocks, mode, undefined, notes);

    children.push(titleP, ...introduction, ...verseParagraphs, ...conclusion);
  }

  const footers = await docxHelper.addBibleTranslationInfo();
  const titleFragment = parseHTML(marked.parse(title));

  let docStyles = mode == 'tagged-verses-with-notes' ? docxHelper.getDocStyles(true) : docxHelper.getDocStyles();

  var doc = new docx.Document({
    title: titleFragment.textContent,
    creator: 'Ezra Bible App',
    description: 'Automatically generated by Ezra Bible App',
    styles: docStyles,
    numbering: docxHelper.getNumberingConfig(),
    sections: [{
      properties: docxHelper.getPageProps(),
      children,
      footers,
    }],
  });

  if (typeof jest !== 'undefined') { // For test environment return all doc details as array without timestamps
    return [children, footers, docxHelper.getDocStyles(), docxHelper.getNumberingConfig()];
  }

  return docx.Packer.toBuffer(doc);
};

function getBibleBookVerseBlocks(bibleBook, verses) {
  var lastVerseNr = 0;
  var allBlocks = [];
  var currentBlock = [];

  // Transform the list of verses into a list of verse blocks (verses that belong together)
  for (let j = 0; j < verses.length; j++) {
    const currentVerse = verses[j];

    if (currentVerse.bibleBookShortTitle == bibleBook.shortTitle) {

      if (currentVerse.absoluteVerseNr > (lastVerseNr + 1)) {
        if (currentBlock.length > 0) {
          allBlocks.push(currentBlock);
        }
        currentBlock = [];
      }

      currentBlock.push(currentVerse);
      lastVerseNr = currentVerse.absoluteVerseNr;
    }
  }

  allBlocks.push(currentBlock);

  return allBlocks;
}

function getBookBlockByChapter(verses) {
  var prevVerseChapter;
  var allBlocks = [];
  var currentBlock = [];

  for (const currentVerse of verses) {

    if (currentVerse.chapter != prevVerseChapter) {
      prevVerseChapter = currentVerse.chapter;
      if (currentBlock.length > 0) {
        allBlocks.push(currentBlock);
        currentBlock = [];
      }
    }

    currentBlock.push(currentVerse);
  }

  allBlocks.push(currentBlock);

  return allBlocks;
}

async function renderVerseBlocks(verseBlocks, mode, bibleBook=undefined, notes={}) {
  const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  const separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
  const chapterText = i18nHelper.getChapterText(undefined, bibleBook || verseBlocks[0][0].bibleBookShortTitle);

  var paragraphs = [];

  for (let j = 0; j < verseBlocks.length; j++) {
    const currentBlock = verseBlocks[j];


    if (mode === 'tagged-verses') { // render as tagged verse list
      paragraphs.push(...(await renderTaggedVersesLayout(currentBlock, bibleBook, separator)));
    } else if (mode === 'book-notes') { // render as book based notes
      const isFirstChapter = j === 0;
      const isMultipleChapters = verseBlocks.length > 1;
      paragraphs.push(...renderBookNotesLayout(currentBlock, notes, isFirstChapter, isMultipleChapters, chapterText));
    } else if (mode === 'tagged-verses-with-notes') {
      paragraphs.push(...(await renderTaggedVersesWithNotesLayout(currentBlock, notes)));
    }
  }

  return paragraphs;
}

async function renderTaggedVersesLayout(verses, bibleBook, separator=":") {
  if (verses.length == 0) {
    return [];
  }

  const firstVerse = verses[0];
  const lastVerse = verses[verses.length - 1];

  // Output the verse reference of this block
  const bookTitle = await i18nHelper.getSwordTranslation(bibleBook.longTitle);
  const firstRef = `${firstVerse.chapter}${separator}${firstVerse.verseNr}`;

  let secondRef = "";
  if (verses.length >= 2) { // At least 2 verses, a bigger block
    if (lastVerse.chapter == firstVerse.chapter) {
      secondRef = "-" + lastVerse.verseNr;
    } else {
      secondRef = " - " + lastVerse.chapter + separator + lastVerse.verseNr;
    }        
  }

  var paragraphs = [new docx.Paragraph({
    text: `${bookTitle} ${firstRef}${secondRef}`,
    heading: docx.HeadingLevel.HEADING_3,
    spacing: {before: 200},
  })];

  const verseParagraphs = verses.map(renderVerse);
  paragraphs.push(...verseParagraphs);

  return paragraphs;
}

function renderBookNotesLayout(currentBlock, notes, isFirstChapter, isMultipleChapters, chapterText) {
  const firstVerse = currentBlock[0];

  var paragraphs = [];

  if (isFirstChapter) {
    const bookReferenceId = firstVerse.bibleBookShortTitle.toLowerCase();
    if (notes[bookReferenceId]) {
      paragraphs.push(...docxHelper.markdownToDocx(notes[bookReferenceId].text, 'notes'));
      paragraphs.push(new docx.Paragraph(""));
    }
  }

  if (isMultipleChapters) { // Output chapter reference
    paragraphs.push(new docx.Paragraph({
      text: `${chapterText} ${firstVerse.chapter}`,
      heading: docx.HeadingLevel.HEADING_3,
    }));
  }

  const table = new docx.Table({
    rows: currentBlock.map(verse => {
      const referenceId = `${verse.bibleBookShortTitle.toLowerCase()}-${verse.absoluteVerseNr}`;

      return new docx.TableRow({
        children: [
          new docx.TableCell({
            children: [renderVerse(verse)],
            width: {
              type: docx.WidthType.DXA,
              size: docx.convertMillimetersToTwip(95)
            },
            borders: {
              top: {color: '555555'},
              left: {color: '555555'},
              bottom: {color: '555555'},
              right: {color: '555555'},
            },
          }),
          new docx.TableCell({
            children: notes[referenceId] ? docxHelper.markdownToDocx(notes[referenceId].text, 'notes') : [],
            width: {
              type: docx.WidthType.DXA,
              size: docx.convertMillimetersToTwip(95)
            },
            borders: {
              top: {color: '555555'},
              left: {color: '555555'},
              bottom: {color: '555555'},
              right: {color: '555555'},
            },
          })
        ],
        cantSplit: true
      });
    }),
    margins: {
      marginUnitType: docx.WidthType.DXA,
      top: docx.convertMillimetersToTwip(2),
      bottom: docx.convertMillimetersToTwip(2),
      left: docx.convertMillimetersToTwip(2),
      right: docx.convertMillimetersToTwip(2),
    },
    width: {
      type: docx.WidthType.DXA,
      size: docx.convertMillimetersToTwip(190)
    },
    columnWidths: [docx.convertMillimetersToTwip(95), docx.convertMillimetersToTwip(95)],

  });

  paragraphs.push(table);

  return paragraphs;
}

async function renderTaggedVersesWithNotesLayout(verses, notes) {
  if (verses.length == 0) {
    return [];
  }

  const bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  let versification = await swordModuleHelper.getThreeLetterVersification(bibleTranslationId);
  let paragraphs = [];

  for (const verse of verses) {
    paragraphs.push(renderVerse(verse, '2779AA'));

    const referenceId = `${versification}-${verse.bibleBookShortTitle.toLowerCase()}-${verse.absoluteVerseNr}`;

    if (notes[referenceId]) {
      let currentNotes = '\n\n' + notes[referenceId].text + '\n\n';

      paragraphs.push(...docxHelper.markdownToDocx(currentNotes, 'notes'));
    }
  }

  return paragraphs;
}

function renderVerse(verse, textColor='000000') {

  let currentVerseContent = "";
  let fixedContent = verse.content.replace(/<([a-z]+)(\s?[^>]*?)\/>/g, '<$1$2></$1>'); // replace self closing tags FIXME: Should it be in the NSI?
  fixedContent = fixedContent.replace(/&nbsp;/g, ' ');
  const currentVerseNodes = Array.from(parseHTML(fixedContent).childNodes);

  currentVerseContent = currentVerseNodes.reduce((prevContent, currentNode) => {
    let textContent = currentNode.textContent;
    let validElement = true;

    // We export everything that is not a DIV (except .sword-quote-jesus)
    // DIV elements contain markup that should not be in the word document
    if (currentNode.nodeName == 'DIV' && currentNode.classList.contains('sword-quote-jesus')) {
      textContent = currentNode.innerText;
    } else if (currentNode.nodeName == 'DIV') {
      validElement = false;
    }

    return validElement ? prevContent + textContent : prevContent;
  }, "");

  return new docx.Paragraph({
    children: [
      new docx.TextRun({text: verse.verseNr, superScript: true, color: textColor}),
      new docx.TextRun({text: " " + currentVerseContent, color: textColor})
    ]
  });

}
