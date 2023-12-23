/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2023 Ezra Bible App Development Team <contact@ezrabibleapp.net>

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

const VerseBox = require("../ui_models/verse_box.js");
const i18nHelper = require('./i18n_helper.js');

module.exports.getSelectedVerseDisplayText = async function(selectedBooks, selectedVerseBoxElements) {
  var selected_verses_content = [];

  for (var i = 0; i < selectedBooks.length; i++) {
    var currentBookShortName = selectedBooks[i];
    var currentBookVerseReferences = [];
    
    for (var j = 0; j < selectedVerseBoxElements.length; j++) {
      var currentVerseBox = selectedVerseBoxElements[j];

      var currentVerseBibleBookShortName = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (currentVerseBibleBookShortName == currentBookShortName) {
        var currentVerseReference = this.getVerseReferenceFromAnchor($(currentVerseBox).find('a:first').attr('name'));
        currentBookVerseReferences.push(currentVerseReference);
      }
    }

    var formatted_verse_list = await this.format_verse_list_for_view(currentBookVerseReferences, false, currentBookShortName);
    var currentBookName = await (currentBookShortName == 'Ps' ? i18nHelper.getPsalmTranslation() : ipcDb.getBookTitleTranslation(currentBookShortName));
    var currentBookVerseReferenceDisplay = currentBookName + ' ' + formatted_verse_list;
    selected_verses_content.push(currentBookVerseReferenceDisplay);
  }

  if (selected_verses_content.length > 0) {
    return selected_verses_content.join('; ');
  } else {
    return i18n.t("tags.none-selected");
  }
};

module.exports.verse_list_has_gaps = function(list) {
  var has_gaps = false;

  for (var i = 1; i < list.length; i++) {
    if ((list[i] - list[i-1]) > 1) {
      has_gaps = true;
      break;
    }
  }

  return has_gaps;
};

module.exports.format_single_verse_block = async function(list, start_index, end_index, turn_into_link, bookId=undefined) {
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  if (start_index > (list.length - 1)) start_index = list.length - 1;
  if (end_index > (list.length - 1)) end_index = list.length - 1;

  var start_reference = list[start_index];
  var end_reference = list[end_index];

  var formatted_passage = "";

  if (start_reference != undefined && end_reference != undefined) {
    formatted_passage = await this.format_passage_reference_for_view(bookId,
                                                                     start_reference,
                                                                     end_reference,
                                                                     ':');

    /*if (turn_into_link) {
      formatted_passage = "<a href=\"javascript:app_controller.jumpToReference('" + start_reference + "', true);\">" + formatted_passage + "</a>";
    }*/
  }

  return formatted_passage;
};

module.exports.verse_reference_list_to_absolute_verse_nr_list = async function(list, bookId=undefined) {
  if (this.verseReferenceHelper == null) {
    return [];
  }

  let new_list = new Array;
  let translationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  
  if (bookId == undefined) {
    bookId = app_controller.tab_controller.getTab().getBook();
  }

  for (let i = 0; i < list.length; i++) {
    let absoluteVerseNr = await this.verseReferenceHelper.referenceStringToAbsoluteVerseNr(translationId, bookId, list[i], false, ':');
    new_list.push(Number(absoluteVerseNr));
  }

  return new_list;
};

module.exports.format_verse_list_for_view = async function(selected_verse_array, link_references, bookId=undefined) {
  var absolute_nr_list = await this.verse_reference_list_to_absolute_verse_nr_list(selected_verse_array, bookId);
  var verse_list_for_view = "";

  if (selected_verse_array.length > 0) {
    if (this.verse_list_has_gaps(absolute_nr_list)) {
      var current_start_index = 0;

      for (var i = 0; i < absolute_nr_list.length; i++) {
        if (absolute_nr_list[i] - absolute_nr_list[i-1] > 1) {

          var current_end_index = i - 1;
          
          verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                      current_start_index,
                                                                      current_end_index,
                                                                      link_references,
                                                                      bookId);

          verse_list_for_view += "; ";

          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                        i,
                                                                        i,
                                                                        link_references,
                                                                        bookId);
          }

          current_start_index = i;
        } else {
          if (i == (absolute_nr_list.length - 1)) {
            verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                        current_start_index,
                                                                        i,
                                                                        link_references,
                                                                        bookId);
          }
        }
      }
    } else { // verse_list doesn't have gaps!
      verse_list_for_view += await this.format_single_verse_block(selected_verse_array,
                                                                  0,
                                                                  selected_verse_array.length - 1,
                                                                  link_references,
                                                                  bookId);
    }
  }

  return verse_list_for_view;
};

module.exports.format_passage_reference_for_view = async function(book_short_title, start_reference, end_reference, reference_separator=undefined) {
  var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

  if (reference_separator == null) {
    reference_separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
  }

  var start_chapter = parseInt(start_reference.split(reference_separator)[0]);
  var start_verse = parseInt(start_reference.split(reference_separator)[1]);
  var end_chapter = parseInt(end_reference.split(reference_separator)[0]);
  var end_verse = parseInt(end_reference.split(reference_separator)[1]);

  var passage = start_chapter + window.reference_separator + start_verse;
  var endChapterVerseCount = await ipcNsi.getChapterVerseCount(bibleTranslationId, book_short_title, end_chapter);

  if (book_short_title != null &&
      start_verse == 1 &&
      end_verse == endChapterVerseCount) {

    /* Whole chapter sections */
    
    if (start_chapter == end_chapter) {
      passage = 'Chap. ' + start_chapter;
    } else {
      passage = 'Chaps. ' + start_chapter + ' - ' + end_chapter;
    }

  } else {

    /* Sections don't span whole chapters */

    if (start_chapter == end_chapter) {
      if (start_verse != end_verse) {
        passage += '-' + end_verse;
      }
    } else {
      passage += ' - ' + end_chapter + window.reference_separator + end_verse;
    }
  }

  return passage;
};

module.exports.getVerseReferenceFromAnchor = function(anchorText) {
  var splittedVerseReference = anchorText.split(" ");
  var currentVerseReference = splittedVerseReference[splittedVerseReference.length - 1];
  return currentVerseReference;
};