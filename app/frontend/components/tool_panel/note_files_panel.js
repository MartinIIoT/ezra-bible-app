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

const eventController = require('../../controllers/event_controller.js');
const { html } = require('../../helpers/ezra_helper.js');

/**
 * The NoteFilesPanel component represents the panel for managing note files.
 * 
 * @category Component
 */
class NoteFilesPanel {
  constructor() {
    this._initDone = false;

    eventController.subscribe('on-notes-panel-switched', (isOpen) => {
      if (isOpen && !this._initDone) {
        this.init();
      }
    });
  }

  init() {
    this.refreshNoteFiles();
    this._initDone = true;

    const addButton = document.getElementById('add-note-file-button');
    addButton.addEventListener('click', () => {
      this.showAddNoteFileDialog();
    });
  }

  showAddNoteFileDialog() {
    const addNoteFileTitle = i18n.t('general.title');

    const dialogBoxTemplate = html`
    <div id="add-note-file-dialog" style="padding-top: 2em;">
      <label id="add-note-file-title">${addNoteFileTitle}:</label>
      <input id="note-file-title-value" type="text" label="" style="width: 25em; border: 1px solid lightgray; border-radius: 4px;"/>
      <div id="note-file-title-error" style="color: red; display: none;">Title already exists</div>
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#add-note-file-dialog');
      
      var width = 400;
      var height = 200;
      var draggable = true;
      var position = [55, 120];

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('notes-panel.add-note-file');
      dialogOptions.dialogClass = 'ezra-dialog add-note-file-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      let createNoteFile = async () => {
        let noteFileTitle = document.getElementById('note-file-title-value').value;
        const noteFiles = await ipcDb.getAllNoteFiles();
        const titleExists = noteFiles.some(noteFile => noteFile.title === noteFileTitle);

        if (titleExists) {
          document.getElementById('note-file-title-error').style.display = 'block';
        } else {
          await ipcDb.createNoteFile(noteFileTitle);
          this.refreshNoteFiles();
          $dialogBox.dialog('close');
        }
      };

      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $dialogBox.dialog('close');
      };

      dialogOptions.buttons[i18n.t('notes-panel.create-note-file')] = {
        id: 'create-note-file-button',
        text: i18n.t('notes-panel.create-note-file'),
        click: () => {
          createNoteFile();
        }
      };
      
      document.getElementById('note-file-title-value').addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
          createNoteFile();
        }
      });

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnAndroid('add-note-file-dialog');

      document.getElementById('note-file-title-value').focus();
    });
  }

  async refreshNoteFiles() {
    const noteFiles = await ipcDb.getAllNoteFiles();
    const noteFilesContainer = document.getElementById('notes-panel-content');
    noteFilesContainer.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'note-files-table';

    const headerRow = document.createElement('tr');
    const titleHeader = document.createElement('th');
    titleHeader.innerText = 'Title';
    const createdAtHeader = document.createElement('th');
    createdAtHeader.innerText = 'Created At';
    const actionsHeader = document.createElement('th');
    actionsHeader.innerText = 'Actions';
    headerRow.appendChild(titleHeader);
    headerRow.appendChild(createdAtHeader);
    headerRow.appendChild(actionsHeader);
    table.appendChild(headerRow);

    noteFiles.forEach(noteFile => {
      const row = document.createElement('tr');
      row.setAttribute('note-file-id', noteFile.id);
      const titleCell = document.createElement('td');
      titleCell.innerText = noteFile.title;
      const createdAtCell = document.createElement('td');
      createdAtCell.innerText = new Date(noteFile.createdAt).toLocaleDateString();

      const actionsCell = document.createElement('td');

      const editButton = document.createElement('button');
      editButton.innerHTML = '<i class="fas fa-pen"></i>';
      editButton.className = 'edit-note-file-button';
      editButton.addEventListener('click', () => {
        this.showEditNoteFileDialog(noteFile.id, noteFile.title);
      });

      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.className = 'delete-note-file-button';

      deleteButton.addEventListener('click', async (event) => {
        const noteFileId = event.target.closest('tr').getAttribute('note-file-id');
        await ipcDb.deleteNoteFile(noteFileId);
        this.refreshNoteFiles();
      });

      actionsCell.appendChild(editButton);
      actionsCell.appendChild(deleteButton);

      row.appendChild(titleCell);
      row.appendChild(createdAtCell);
      row.appendChild(actionsCell);
      table.appendChild(row);
    });

    noteFilesContainer.appendChild(table);
  }

  showEditNoteFileDialog(noteFileId, currentTitle) {
    const editNoteFileTitle = i18n.t('general.title');

    const dialogBoxTemplate = html`
    <div id="edit-note-file-dialog" style="padding-top: 2em;">
      <label id="edit-note-file-title">${editNoteFileTitle}:</label>
      <input id="edit-note-file-title-value" type="text" value="${currentTitle}" style="width: 25em; border: 1px solid lightgray; border-radius: 4px;"/>
      <div id="edit-note-file-title-error" style="color: red; display: none;">Title already exists</div>
    </div>
    `;

    return new Promise((resolve) => {
      document.querySelector('#boxes').appendChild(dialogBoxTemplate.content);
      const $dialogBox = $('#edit-note-file-dialog');
      
      var width = 400;
      var height = 200;
      var draggable = true;
      var position = [55, 120];

      let dialogOptions = uiHelper.getDialogOptions(width, height, draggable, position);
      dialogOptions.title = i18n.t('notes-panel.edit-note-file');
      dialogOptions.dialogClass = 'ezra-dialog edit-note-file-dialog';
      dialogOptions.close = () => {
        $dialogBox.dialog('destroy');
        $dialogBox.remove();
        resolve();
      };

      let updateNoteFile = async () => {
        let newTitle = document.getElementById('edit-note-file-title-value').value;
        const noteFiles = await ipcDb.getAllNoteFiles();
        const titleExists = noteFiles.some(noteFile => noteFile.title === newTitle && noteFile.id !== noteFileId);

        if (titleExists) {
          document.getElementById('edit-note-file-title-error').style.display = 'block';
        } else {
          await ipcDb.updateNoteFile(noteFileId, newTitle);
          this.refreshNoteFiles();
          $dialogBox.dialog('close');
        }
      };

      dialogOptions.buttons = {};

      dialogOptions.buttons[i18n.t('general.cancel')] = function() {
        $dialogBox.dialog('close');
      };

      dialogOptions.buttons[i18n.t('notes-panel.update-note-file')] = {
        id: 'update-note-file-button',
        text: i18n.t('notes-panel.update-note-file'),
        click: () => {
          updateNoteFile();
        }
      };
      
      document.getElementById('edit-note-file-title-value').addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
          updateNoteFile();
        }
      });

      $dialogBox.dialog(dialogOptions);
      uiHelper.fixDialogCloseIconOnAndroid('edit-note-file-dialog');

      const inputField = document.getElementById('edit-note-file-title-value');
      inputField.focus();
      inputField.setSelectionRange(inputField.value.length, inputField.value.length);
    });
  }
}

module.exports = NoteFilesPanel;
