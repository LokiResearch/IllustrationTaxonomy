#!/usr/bin/python3
# -*- coding: utf-8 -*-

# Author: Axel Antoine
# https://axantoine.com

# Loki, Inria project-team with Université de Lille
# within the Joint Research Unit UMR 9189 CNRS-Centrale
# Lille-Université de Lille, CRIStAL.
# https://loki.lille.inria.fr

# LICENCE: Licence.md

import sys
import os
import csv
import json
import random
import math
from PyQt5.QtGui import *
from PyQt5.QtCore import *
from PyQt5.QtWidgets import *

app_version = 'v2020.2.24'

DEFAULT_IMAGES_PATH = './images_step1'
DEFAULT_CSV_FILE = './coding.csv'

SUPPORTED_IMAGE_FORMATS = []
for f in QImageReader.supportedImageFormats():
    SUPPORTED_IMAGE_FORMATS.append(str(f.data(), encoding='utf-8'))

# A very simplistic image class storing name and path
class Image():
    def __init__(self, path : str):
        self.path = path
        self.name = os.path.basename(path)


class StarRating(object):
    # enum EditMode
    Editable, ReadOnly = range(2)

    PaintingScaleFactor = 30

    def __init__(
            self, 
            starCount=1, 
            maxStarCount=5, 
            polygon_type='star', 
            color = QColor(49,130,189)):

        self._starCount = starCount
        self._maxStarCount = maxStarCount
        self.color = color
        
        if polygon_type == 'star':
            self.starPolygon = QPolygonF([QPointF(1.0, 0.5)])
            for i in range(5):
                self.starPolygon << QPointF(0.5 + 0.5 * math.cos(0.8 * i * math.pi),
                                            0.5 + 0.5 * math.sin(0.8 * i * math.pi))
        elif polygon_type == 'round':
            self.starPolygon = QPolygonF()
            for i in range(8):
                self.starPolygon << QPointF(0.5 + 0.5 * math.cos(2*i/5 * math.pi),
                                            0.5 + 0.5 * math.sin(2*i/5 * math.pi))

        self.diamondPolygon = QPolygonF()
        self.diamondPolygon << QPointF(0.4, 0.5) \
                            << QPointF(0.5, 0.4) \
                            << QPointF(0.6, 0.5) \
                            << QPointF(0.5, 0.6) \
                            << QPointF(0.4, 0.5)

    def starCount(self):
        return self._starCount

    def maxStarCount(self):
        return self._maxStarCount

    def setStarCount(self, starCount):
        self._starCount = starCount

    def setMaxStarCount(self, maxStarCount):
        self._maxStarCount = maxStarCount

    def sizeHint(self):
        return self.PaintingScaleFactor * QSize(self._maxStarCount, 1)

    def paint(self, painter, rect, palette, editMode):
        painter.save()

        painter.setRenderHint(QPainter.Antialiasing, True)
        painter.setPen(Qt.NoPen)

        painter.setBrush(self.color)

        yOffset = (rect.height() - self.PaintingScaleFactor) / 2
        painter.translate(rect.x(), rect.y() + yOffset)
        painter.scale(self.PaintingScaleFactor, self.PaintingScaleFactor)

        for i in range(self._maxStarCount):
            if i < self._starCount:
                painter.drawPolygon(self.starPolygon, Qt.WindingFill)
            elif editMode == StarRating.Editable:
                painter.drawPolygon(self.diamondPolygon, Qt.WindingFill)

            painter.translate(1.0, 0.0)

        painter.restore()

class StarEditor(QWidget):

    editingFinished = pyqtSignal(int)

    def __init__(self, parent = None, polygon_type = 'star', color = QColor(49,130,189)):
        super(StarEditor, self).__init__(parent)

        self._starRating = StarRating(polygon_type = polygon_type, color = color)

        self.setMouseTracking(True)
        self.setAutoFillBackground(True)

        self.dragging = False

    def GetRating(self):
        return self._starRating.starCount()

    def SetRating(self, rating:int):
        self._starRating.setStarCount(
            min(rating, self._starRating.maxStarCount()))
        self.update()

    def sizeHint(self):
        return self._starRating.sizeHint()

    def paintEvent(self, event):
        painter = QPainter(self)
        self._starRating.paint(painter, self.rect(), self.palette(),
                StarRating.Editable)

    def mousePressEvent(self, event):
        self.dragging = True

    def mouseMoveEvent(self, event):
        if self.dragging:
            star = self.starAtPosition(event.x())
            if star != self._starRating.starCount() and star != -1:
                self._starRating.setStarCount(star)
                self.update()

    def mouseReleaseEvent(self, event):
        self.dragging = False
        star = self.starAtPosition(event.x())
        if star != self._starRating.starCount() and star != -1:
            self._starRating.setStarCount(star)
            self.update()
        self.editingFinished.emit(self._starRating)

    def starAtPosition(self, x):
        # Enable a star, if pointer crosses the center horizontally.
        starwidth = self._starRating.sizeHint().width() // self._starRating.maxStarCount()
        star = (x + starwidth / 2) // starwidth
        if 0 <= star <= self._starRating.maxStarCount():
            return star
        return -1

# A custom widget based on scroll area to display an resizable image in a 
# QLabel
class ImageWidget(QScrollArea):
    def __init__(self):
        super().__init__()
        self.image_label = QLabel()
        self.image_label.setBackgroundRole(QPalette.Base)
        self.image_label.setSizePolicy(QSizePolicy.Ignored, QSizePolicy.Ignored)
        self.image_label.setScaledContents(True)

        self.setBackgroundRole(QPalette.Dark)
        self.setWidget(self.image_label)

        # Enable PinchGesture recognition
        self.grabGesture(Qt.PinchGesture)

        self.scale_factor = 1

    # Reset the displayed image by display an empty image
    def clear(self):
        self.image_label.setPixmap(QPixmap())

    # Set the current image displayed in the widget
    def setImage(self, image : Image):
        self.image_label.setPixmap(QPixmap(image.path).scaled(0.99*self.size(),
                                   Qt.KeepAspectRatio))
        self.image_label.adjustSize()
        self.scale_factor =1
        self.scale_image(1)

    # Triggered on events
    def event(self, event : QEvent) -> bool:
        if event.type() == QEvent.Gesture:
            return self.gestureEvent(event)
        return super().event(event)

    # Triggered on gesture events
    def gestureEvent(self, event : QGestureEvent) -> bool:
        # Try to cast in PinchGesture
        gesture = event.gesture(Qt.PinchGesture)
        if gesture:
            self.pinchTriggered(gesture)
            return True
        return False

    # Resize the image using a pinch gesture
    def pinchTriggered(self, gesture : QPinchGesture) -> None:
        self.scale_image(gesture.scaleFactor())

    # Scale the image by factor with 0.5 < factor < 2
    def scale_image(self, factor : float):
        if not self.image_label.pixmap():
            return

        tmp_scale_factor = self.scale_factor * factor
        if tmp_scale_factor < 0.5 or tmp_scale_factor > 2:
            return

        self.scale_factor = tmp_scale_factor

        self.image_label.resize(self.scale_factor * 
                                self.image_label.pixmap().size())

        self.adjustScrollbar(self.verticalScrollBar(),  factor)
        self.adjustScrollbar(self.horizontalScrollBar(),  factor)

    # Custom behavior on double click events:
    # If image is zoomed -> de-zoom and vice-versa
    def mouseDoubleClickEvent(self, event : QMouseEvent):

        if abs(self.scale_factor-1) < 0.03:
            self.scale_image(2)
        else:
            self.scale_image(1/self.scale_factor)

    # Function to recenter scrollbars on the resizable content
    def adjustScrollbar(self, scroll_bar : QScrollBar, factor : float):
        scroll_bar.setValue(int(factor * scroll_bar.value() + ((factor - 1) * 
                            scroll_bar.pageStep()/2)))

# Custom TreeViewItem to be displayed in a TreeViewWidget
class CodeTreeViewItem(QTreeWidgetItem):
    def __init__(self, name: str):
        super().__init__([name])
        self.old_name = None
        self.last_change_role = None
        self.textinfo = None
        self.key = False

    # Reverse the check state of the item
    def reverseCheck(self):
        if self.checkState(0) == Qt.Checked:
            self.setCheckState(0, Qt.Unchecked)
        else:
            self.setCheckState(0, Qt.Checked)

    # Check if a item with the same name already exist in the TreeWidget
    def codeNameAlreadyExist(self, code: str) -> bool:
        it = QTreeWidgetItemIterator(self.treeWidget());
        while it.value():
            if it.value().text(0) == code:
                return True
            it+=1
        return False

    # Callback on item when data is changed at the specified item column for
    # the specified role with the specified value
    def setData(self, column: int, role: Qt.ItemDataRole, value: QVariant):
        self.last_change_role = role
        self.old_name = self.text(0)

        # role is Qt.EditRole when item test is modified
        # here, we are only using column 0
        if role == Qt.EditRole and column == 0:
            if self.codeNameAlreadyExist(value):
                msg = QMessageBox()
                msg.setText("Code already exist, please rename.")
                msg.setWindowTitle("Error")
                msg.setStandardButtons(QMessageBox.Ok)
                msg.exec()
                return
            elif '@' in value:
                msg = QMessageBox()
                msg.setText("Forbidden character '@' used.")
                msg.setWindowTitle("Error")
                msg.setStandardButtons(QMessageBox.Ok)
                msg.exec()
                return

        if (role == Qt.CheckStateRole) and self.childCount() > 0:
            value = QVariant()

        # Call QTreeWidgetItem setData() function that will care a lot of stuff
        # for us (such as emitting the dataChanged() signal).
        # Cannot call the signal here because QTreeWidgetItem is not a subclass
        # of QObject
        super().setData(column, role, value)

# Custom TreeView to display TreeViewItem
class CodeTreeView(QTreeWidget):
    delete_item_signal = pyqtSignal(CodeTreeViewItem)
    add_item_signal = pyqtSignal(CodeTreeViewItem)

    def __init__(self):
        super().__init__()
        self.createActions()

    def keyPressEvent(self, event : QKeyEvent) -> None:
        if event.key() == Qt.Key_Space:
            if self.currentItem():
                self.currentItem().reverseCheck()

        elif event.key() == Qt.Key_Delete or event.key() == Qt.Key_Backspace:
            if self.currentItem():
                self.deleteSelectedItem()
        else:
            super().keyPressEvent(event)

    # Create actions used in the context menu (right click)
    def createActions(self):
        self.add_item_action = QAction("Add", self)
        self.add_item_action.setStatusTip("Add a code to the category")
        self.add_item_action.triggered.connect(self.addItem)

        self.delete_item_action = QAction("Delete", self)
        self.delete_item_action.setShortcuts(QKeySequence.Delete)
        self.delete_item_action.setStatusTip("Delete code")
        self.delete_item_action.triggered.connect(self.deleteItem)

    # Display the context menu (default right click)
    def contextMenuEvent(self, event : QContextMenuEvent) -> None:
        super().contextMenuEvent(event)

        # Check if there is an item under the context menu event 
        item = self.itemAt(event.pos())
        if item:
            # Build the context menu with custom actions and show it
            context_menu = QMenu(self)
            context_menu.addAction(self.add_item_action)
            context_menu.addAction(self.delete_item_action)
            context_menu.popup(event.globalPos())

    # Customize the apparence of the items
    def drawRow(self, p : QPainter, opt : QStyleOptionViewItem, idx : QModelIndex):
        super().drawRow(p, opt, idx)
        
        item = self.itemFromIndex(idx)
        if item.parent() and not item.parent().parent():
            rect = self.visualRect(idx)
            py = rect.y()
            pw = rect.width()
            p.setPen( QColor( 82, 82, 82 ) )
            p.drawLine( 0, py, pw + 10, py)

    @pyqtSlot()
    def deleteItem(self):
        self.delete_item_signal.emit(self.currentItem())

    @pyqtSlot()
    def addItem(self):
        self.add_item_signal.emit(self.currentItem())

# Utility class for managing data
class CodingData():

    def __init__(self):
        # Store the codes hierarchy
        self.code_dict = {}
        # Store the coding of images and codes
        self.coding_dict = {}
        # Store the captions for the images
        self.captions_dict = {}
        # Store the comments for the images
        self.comments_dict = {}
        # Store the ratings for the images
        self.ratings_dict = {}
        # Store the confidences of coding for the images
        self.confidences_dict = {}

    # Load data from input file with a JSON format
    def LoadDataFromFile(self, filepath : str) -> None:
        try:
            in_file = open(filepath, 'r')
            json_data = json.load(in_file)
            in_file.close()

            self.code_dict = json_data.get('codes', {})
            self.coding_dict = json_data.get('coding', {})
            self.captions_dict = json_data.get('captions', {})
            self.dois_dict = json_data.get('dois',{})
            self.comments_dict = json_data.get('comments', {})
            self.ratings_dict = json_data.get('ratings', {})
            self.confidences_dict = json_data.get('confidences', {})
        except:
            pass

    # Save data to output file with a JSON format
    def SaveDataToFile(self, filepath : str) -> None:
        json_data = {'captions': self.captions_dict,
                     'codes': self.code_dict, 
                     'coding': self.coding_dict,
                     'comments': self.comments_dict,
                     'ratings': self.ratings_dict,
                     'confidences': self.confidences_dict,
                     'dois': self.dois_dict}
        out_file = open(filepath, 'w')
        json.dump(json_data, out_file, indent = ' ')
        out_file.close()

    # Loads self.code_dict into a QTreeWidgetItem
    def LoadCodeTree(self) -> CodeTreeViewItem:
        def createItem(code : dict) -> CodeTreeViewItem:
            new_item = CodeTreeViewItem(code.get('name',''))
            new_item.setToolTip(0,code.get('textinfo', 'Not specified'))
            new_item.key = code.get('key', False)
            new_item.setCheckState(0, Qt.Unchecked)
            new_item.setFlags(new_item.flags() | Qt.ItemIsEditable)
            for child in code.get('children',[]):
                new_item.addChild(createItem(child))
            return new_item
        return createItem(self.code_dict)

    # Save a QTreeWidgetItem into the self.code_dict
    def SaveCodeTree(self, codes_tree : CodeTreeViewItem):
        def createDict(item : CodeTreeViewItem):
            new_dict = dict()
            new_dict['name'] = item.text(0)
            new_dict['key'] = item.key
            new_dict['textinfo'] = item.toolTip(0)
            children = []
            for i in range(0, item.childCount()):
                children.append(createDict(item.child(i)))
            new_dict['children'] = children
            return new_dict        
        self.code_dict = createDict(codes_tree)

    # Replace a specific code with nameA by nameB in all images
    def RenameCode(self, item : CodeTreeViewItem):
        old_name = item.old_name
        new_name = item.text(0)
        if item.parent():
            old_name = item.parent().text(0) + '@' + old_name
            new_name = item.parent().text(0) + '@' + new_name

        for image in self.coding_dict.keys():
            if old_name in self.coding_dict[image]:
                self.coding_dict[image].remove(old_name)
                self.coding_dict[image].append(new_name)

    # Add the code to the image in the dict
    def AddCodeForImage(self, image : Image, item : CodeTreeViewItem):
        code = item.text(0)
        if item.parent():
            code = item.parent().text(0) + '@' + code

        if self.coding_dict.get(image.name, None):
            if code not in self.coding_dict[image.name]:
                self.coding_dict[image.name].append(code)
        else:
            self.coding_dict[image.name] = [code]

    # Add the comment to the image
    def AddCommentForImage(self, image : Image, comment : str):
        self.comments_dict[image.name] = comment

    # Add the rating score to the image
    def AddRatingForImage(self, image: Image, rating: int):
        self.ratings_dict[image.name] = rating

    # Add confidence score to the image
    def AddConfidenceForImage(self, image: Image, confidence: int):
        self.confidences_dict[image.name] = confidence   

    # Delete the code to the image in the dict
    def RemoveCodeForImage(self, image : Image, item : CodeTreeViewItem):
        code = item.text(0)
        if item.parent():
            code = item.parent().text(0) + '@' + code

        if (self.coding_dict.get(image.name, None) and 
            code in self.coding_dict[image.name]):
            self.coding_dict[image.name].remove(code)

    # Get the captions for the given image
    def CaptionForImage(self, image : Image):
        name = image.name
        name = name.replace('.stability', '')
        return self.captions_dict.get(name, "Extraction failed for the caption")

    def CommentForImage(self, image : Image):
        return self.comments_dict.get(image.name, "")    

    def RatingForImage(self, image: Image):
        return self.ratings_dict.get(image.name, 0)

    def ConfidenceForImage(self, image: Image):
        return self.confidences_dict.get(image.name, 0)


# Main window of the application
class CodingApp(QMainWindow):

    def __init__(self):
        super().__init__()
        self.title = 'Taxonomy Coding App '+app_version
        self.current_image = None
        self.images = []
        self.coding_data = CodingData()

        self.init_ui()
        self.createShortcuts()
        self.loadSettings()
        self.Update()

    def loadSettings(self):
        settings = QSettings('app_settings','AppTaxonomy')
        images_path = settings.value('images_path',DEFAULT_IMAGES_PATH)
        coding_path = settings.value('coding_path',DEFAULT_CSV_FILE)
        self.move(settings.value('position',QPoint(500,500)))
        self.resize(settings.value('size',QSize(900,500)))
        self.set_images_path(images_path)
        self.set_coding_path(coding_path)

    def writeSettings(self):
        settings = QSettings('app_settings','AppTaxonomy')
        settings.setValue('images_path', self.images_path)
        settings.setValue('coding_path', self.coding_path)
        settings.setValue('position', self.pos())
        settings.setValue('size', self.size())

    def closeEvent(self, event : QCloseEvent):
        self.save()
        self.writeSettings()

    def init_ui(self):
        self.setCentralWidget(QWidget())
        self.setWindowTitle(self.title)

        mainlayout = QHBoxLayout()

        vlayout = QVBoxLayout()

        # Images path
        images_path_layout = QHBoxLayout()
        self.images_path_button = QPushButton("Load Images")
        self.images_path_button.clicked.connect(self.on_images_path_button_click)
        self.images_path_label = QLabel("") 
        images_path_layout.addWidget(self.images_path_button)
        images_path_layout.addWidget(self.images_path_label)

        # Coding path line
        coding_path_layout = QHBoxLayout()
        self.coding_path_button = QPushButton("Load coding")
        self.new_coding_button = QPushButton("New coding")
        self.coding_path_button.clicked.connect(self.on_coding_path_button_click)
        self.new_coding_button.clicked.connect(self.on_new_coding_button_click)
        self.coding_path_label = QLabel("")
        coding_path_layout.addWidget(self.coding_path_button)
        coding_path_layout.addWidget(self.new_coding_button)
        coding_path_layout.addWidget(self.coding_path_label)


        # Image viewer
        image_layout = QVBoxLayout()
        self.image_viewer = ImageWidget()
        self.image_label = QLabel()
        self.caption_label = QLabel()
        self.caption_label.setWordWrap(True)
        image_layout.addWidget(self.image_viewer)
        image_layout.addWidget(self.image_label)
        image_layout.addWidget(self.caption_label)

        nav_layout = QHBoxLayout()
        prev_button = QPushButton('< [\u2318+O]')
        prev_button.clicked.connect(self.on_prev_image_button_click)
        next_button = QPushButton('> [\u2318+P]')
        next_button.clicked.connect(self.on_next_image_button_click)

        self.img_textfield = QLineEdit('')
        self.img_textfield.setSizePolicy(QSizePolicy.Minimum,QSizePolicy.Fixed)
        self.img_textfield.returnPressed.connect(self.on_image_nav_return_pressed)

        self.number_images_label = QLabel()
        self.number_images_label.setSizePolicy(
            QSizePolicy.Fixed,QSizePolicy.Fixed)
        nav_layout.addSpacerItem(
            QSpacerItem(0,0,QSizePolicy.Expanding,QSizePolicy.Fixed))
        nav_layout.addWidget(prev_button)
        nav_layout.addWidget(self.img_textfield)
        nav_layout.addWidget(self.number_images_label)
        nav_layout.addWidget(next_button)
        nav_layout.addSpacerItem(
            QSpacerItem(0,0,QSizePolicy.Expanding,QSizePolicy.Fixed))

        vlayout.addLayout(images_path_layout)
        vlayout.addLayout(coding_path_layout)
        vlayout.addLayout(image_layout)
        vlayout.addLayout(nav_layout)

        # Coding layout

        codingLayout = QVBoxLayout()

        self.key_codes_label = QLabel("Key codes checked")
        self.key_codes_label.setAlignment(Qt.AlignCenter)
        self.completion_label = QLabel("Completion")
        self.completion_label.setAlignment(Qt.AlignCenter)

        # Star editor for rating the images
        star_layout = QHBoxLayout()
        self.star_editor_label = QLabel("Rating:")
        self.star_editor = StarEditor()
        self.star_editor.editingFinished.connect(self.on_star_rating_finished)
        star_layout.addWidget(self.star_editor_label)
        star_layout.addWidget(self.star_editor)

        # Star editor for confidence about the coding
        confidence_layout = QHBoxLayout()
        self.confidence_editor_label = QLabel("Confidence:")
        self.confidence_editor = StarEditor(
                polygon_type = 'round', color = QColor(100,200,100))
        self.confidence_editor.editingFinished.connect(self.on_confidence_rating_finished)
        confidence_layout.addWidget(self.confidence_editor_label)
        confidence_layout.addWidget(self.confidence_editor)

        self.code_tree_view = CodeTreeView()
        self.comment_text_label = QLabel("Comments")
        self.comment_text_edit = QTextEdit()
        self.code_tree_view.itemChanged.connect(self.on_item_changed)
        self.code_tree_view.delete_item_signal.connect(self.on_delete_code_item)
        self.code_tree_view.add_item_signal.connect(self.on_add_code_item)
        self.comment_text_edit.textChanged.connect(self.on_comment_changed)


        codingLayout.addWidget(self.key_codes_label)
        codingLayout.addWidget(self.completion_label)
        codingLayout.addLayout(star_layout)
        codingLayout.addLayout(confidence_layout)
        codingLayout.addWidget(self.code_tree_view,10)
        codingLayout.addWidget(self.comment_text_label)
        codingLayout.addWidget(self.comment_text_edit,1)
     
        mainlayout.addLayout(vlayout,8)
        mainlayout.addLayout(codingLayout,2)

        self.centralWidget().setLayout(mainlayout)

        #self.showMaximized()
        self.show()

    def set_images_path(self, path : str):
        self.images_path_label.setText(path)
        self.images_path = path
        self.loadImagesFromDisk()

    def set_coding_path(self, path : str):
        self.coding_path_label.setText(path)
        self.coding_path = path
        self.coding_data.LoadDataFromFile(path)
        widget_item = self.coding_data.LoadCodeTree()
        self.code_tree_view.insertTopLevelItem(0, widget_item)
        self.code_tree_view.expandAll()

    def createShortcuts(self):

        shortcuts_menu = self.menuBar().addMenu('Shortcuts')

        action = QAction("Previous image", self)
        action.setShortcut(QKeySequence("Ctrl+O"))
        shortcuts_menu.addAction(action)
        action.triggered.connect(self.on_prev_image_button_click)

        action = QAction("Next image", self)
        action.setShortcut(QKeySequence("Ctrl+P"))
        shortcuts_menu.addAction(action)
        action.triggered.connect(self.on_next_image_button_click)

        action = QAction("Focus code list", self)
        action.setShortcut(QKeySequence("Tab"))
        shortcuts_menu.addAction(action)
        action.triggered.connect(self.focus_code_list)

    # def resizeEvent(self, event):
    #     self.updateView()

    def loadImagesFromDisk(self):
        if os.path.isdir(self.images_path):
            self.images = []
            files = os.listdir(self.images_path)
            for file in files:
                if file.split('.')[-1] in SUPPORTED_IMAGE_FORMATS:
                    self.images.append(
                        Image(os.path.join(self.images_path,file)))
            self.images.sort(key=lambda img : img.name)
            random.seed(12) # I like this number
            random.shuffle(self.images)
            self.number_images_label.setText('/%d'%len(self.images))
            if len(self.images) > 0:
                self.current_image = self.images[0]

    def Update(self):
        if self.current_image is None:
            self.image_viewer.clear()
            return
        
        # Show image
        self.image_viewer.setImage(self.current_image) 
        self.image_label.setText(self.current_image.name)
        self.caption_label.setText(self.coding_data.CaptionForImage(self.current_image))
        self.img_textfield.setText(str(self.images.index(self.current_image)+1))

        # Update codes
        it = QTreeWidgetItemIterator(self.code_tree_view);
        while it.value():
            name = it.value().text(0)
            if it.value().parent():
                name = it.value().parent().text(0) + '@' + name

            if (name in 
                self.coding_data.coding_dict.get(self.current_image.name,[])):
                it.value().setCheckState(0,Qt.Checked)
            else:
                it.value().setCheckState(0,Qt.Unchecked)

            it += 1

        self.CheckKeyCodes()
        self.UpdateCompletionLabel()

        self.comment_text_edit.setText(
            self.coding_data.CommentForImage(self.current_image))

        self.star_editor.SetRating(
            self.coding_data.RatingForImage(self.current_image))

        self.confidence_editor.SetRating(
            self.coding_data.ConfidenceForImage(self.current_image))

    def UpdateCompletionLabel(self):
        total = len(self.images)
        completed = 0
        for codes in self.coding_data.coding_dict.values():
            if len(codes) > 5 or ('Taxonomy@not_interaction' in codes):
                completed += 1

        self.completion_label.setText("Completion: ~%d/%d"%(completed,total))


    def CheckKeyCodes(self):
        all_key_codes_checked = True

        bypass = False

        it = QTreeWidgetItemIterator(self.code_tree_view);
        while it.value():
            if it.value().key:
                checked =  self.OneChildIsAtLeastChecked(it.value())
                if checked:
                    it.value().setBackground(0, QBrush(QColor(0,255,0, 100)))
                else:
                    it.value().setBackground(0, QBrush(QColor(255,0,0, 100)))
                all_key_codes_checked = all_key_codes_checked and checked

            if (it.value().checkState(0) == Qt.Checked and
                it.value().text(0) == 'not_interaction'):
                bypass = True

            it += 1

        if all_key_codes_checked or bypass:
           self.key_codes_label.setStyleSheet("QLabel { background-color : rgba(0,255,0,0.5); }")
        else:
           self.key_codes_label.setStyleSheet("QLabel { background-color : rgba(255,0,0,0.5); }")

    def OneChildIsAtLeastChecked(self, item: CodeTreeViewItem):
        it = QTreeWidgetItemIterator(item);
        n = 1
        cpt = 0
        while it.value() and cpt < n:
            n += it.value().childCount()
            if it.value().checkState(0) == Qt.Checked:
                return True
            it += 1
            cpt += 1
        return False  

    def save(self):
        self.coding_data.SaveCodeTree(self.code_tree_view.topLevelItem(0))
        self.coding_data.SaveDataToFile(self.coding_path)


    @pyqtSlot(QTreeWidgetItem)
    def on_item_changed(self, item : QTreeWidgetItem):
        if self.current_image is None:
            return

        if item.last_change_role == Qt.EditRole:
            self.coding_data.RenameCode(item)
        elif item.last_change_role == Qt.CheckStateRole:
            if item.checkState(0) == Qt.Checked:
                self.coding_data.AddCodeForImage(self.current_image, item)
            else:
                self.coding_data.RemoveCodeForImage(self.current_image, item)

        self.CheckKeyCodes()

    @pyqtSlot(CodeTreeViewItem)
    def on_delete_code_item(self, item : CodeTreeViewItem):
        parent = item.parent()
        if parent:
            parent.removeChild(item)
            if parent.childCount() == 0:
                parent.setCheckState(0, Qt.Unchecked)
        else:
            self.code_tree_view.takeTopLevelItem(
                self.code_tree_view.indexOfTopLevelItem(item))
        del item

    @pyqtSlot(CodeTreeViewItem)
    def on_add_code_item(self, item : CodeTreeViewItem):
        new_item = CodeTreeViewItem("New code")
        new_item.setCheckState(0, Qt.Unchecked)
        item.addChild(new_item)
        new_item.setFlags(new_item.flags() | Qt.ItemIsEditable)
        item.setExpanded(True)        
        item.setCheckState(0, Qt.Unchecked)


    @pyqtSlot()
    def on_images_path_button_click(self):
        result = QFileDialog.getExistingDirectory(self, 'Open directory',
                                                        os.getcwd())
        if result:
            self.set_images_path(result)
            self.Update()

    @pyqtSlot()
    def on_coding_path_button_click(self):
        result = QFileDialog.getOpenFileName(self, 'Open file',os.getcwd(),
                                                    "JSON File (*.json)")
        if result[0]:
            self.set_coding_path(result[0])
            self.Update()

    @pyqtSlot()
    def on_new_coding_button_click(self):
        result = QFileDialog.getSaveFileName(self, 'Save file',os.getcwd(), 
                                                    "JSON File (*.json)")
        if result[0]:
            self.set_coding_path(result[0])
            self.Update()

    @pyqtSlot()
    def on_next_image_button_click(self):
        if self.current_image is None:
            return
        self.current_image = self.images[
            (self.images.index(self.current_image)+1)%len(self.images)]
        self.Update()
        self.save()

    @pyqtSlot()
    def on_prev_image_button_click(self):
        if self.current_image is None:
            return
        self.current_image = self.images[
            (self.images.index(self.current_image)-1)%len(self.images)]
        self.Update()
        self.save()

    @pyqtSlot()
    def focus_code_list(self):
        if not self.code_tree_view.hasFocus():
            self.code_tree_view.setFocus()
            # Deselect all items in the tree view
            it = QTreeWidgetItemIterator(self.code_tree_view);
            while it.value():
                it.value().setSelected(False)
                it+=1
            # Select the first item
            if self.code_tree_view.topLevelItemCount() > 0:
                self.code_tree_view.topLevelItem(0).setSelected(True)

    @pyqtSlot()
    def on_image_nav_return_pressed(self):
        if len(self.images) > 0:
            new_image_idx = 1
            try:
                new_image_idx = int(self.img_textfield.text())
                if new_image_idx > len(self.images) or new_image_idx < 1:
                    new_image_idx = 1
            except:
                pass
            self.current_image = self.images[new_image_idx-1]
            self.Update()
            self.save()

    @pyqtSlot()
    def on_comment_changed(self):
        if self.current_image is None:
            return
        self.coding_data.AddCommentForImage(self.current_image, 
                                            self.comment_text_edit.toPlainText())  
   
    @pyqtSlot()
    def on_star_rating_finished(self):
        if self.current_image is None:
            return
        rating = self.star_editor.GetRating()        
        if rating <= 0:
            return
        self.coding_data.AddRatingForImage(self.current_image, rating)

    @pyqtSlot()
    def on_confidence_rating_finished(self):
        if self.current_image is None:
            return
        confidence = self.confidence_editor.GetRating()
        if confidence <= 0:
            return
        self.coding_data.AddConfidenceForImage(self.current_image, confidence)


if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = CodingApp()
    sys.exit(app.exec_())


    