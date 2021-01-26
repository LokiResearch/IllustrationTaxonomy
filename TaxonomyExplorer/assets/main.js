// Author: Axel Antoine
// https://axantoine.com

// Loki, Inria project-team with Université de Lille
// within the Joint Research Unit UMR 9189 CNRS-Centrale
// Lille-Université de Lille, CRIStAL.
// https://loki.lille.inria.fr

// LICENCE: Licence.md

var data;
var how_codes_sort_type = "percentage";
var what_codes_sort_type = "percentage";
var images = [];
var what_occurences_dict = {};
var how_occurences_dict = {};
var selected_codes = [];
const images_path = '../data/images/';

const red_light_color = [244, 198, 203]
const red_dark_color = [244, 95, 110]
const blue_light_color = [185, 219, 253]
const blue_dark_color = [86, 168, 253]

$.getJSON("../data/data.json", function(json) {

    data = json;

    function getListItem(data, class_name, style) {
      var item = document.createElement('label');
      item.classList.add('container', 'list-group-item', 'py-0', 'list-group-item-action', 'list-group-item', class_name);
      item.setAttribute('code', data.code)
      item.setAttribute('id', data.code + '-item')

      var row = document.createElement('div');
      row.classList.add('row');

      var text = document.createTextNode(data.code.replace('@',' > '));
 
      var checkbox_col = document.createElement('div');
      checkbox_col.classList.add('col-9')
      var checkbox = document.createElement("input");
      checkbox.classList.add('checkbox')
      checkbox.setAttribute('type',"checkbox");
      checkbox.setAttribute('code', data.code)
      checkbox.setAttribute('label_style', style);
      checkbox.setAttribute('name', data.code);
      checkbox.setAttribute('onclick', 'codeChecked(this)');
      checkbox_col.appendChild(checkbox);
      checkbox_col.appendChild(text);
      row.appendChild(checkbox_col);

      var percentage = document.createElement('div');
      percentage.setAttribute('id',data.code+'-percentage');
      percentage.classList.add('col-3')
      row.appendChild(percentage);

      item.appendChild(row);
      return item
    }

    //  function getTreeParentItem(data, class_name, data_target, style) {
    //   var item = document.createElement("a");
    //   item.classList.add('list-group-item', 'py-0', 'list-group-item-action', 'list-group-item-'+style, class_name);
    //   item.setAttribute('href','#')
    //   // item.setAttribute('id', data.code + '-item')
    //   item.setAttribute('data-toggle', "collapse");
    //   item.setAttribute('data-target', '#'+data_target)
    //   item.onclick = on_list_group_item_clicked;

    //   // Append chevron for collapsing
    //   var chevron = document.createElement("i");
    //   chevron.classList.add('fa','fa-chevron-right')
    //   item.appendChild(chevron);
      
    //   var text = document.createTextNode(data.name);
    //   item.appendChild(text);
    //   return item
    // }

    // function getTreeChildItem(data, class_name, style) {
    //   var item = document.createElement("label");
    //   item.classList.add('container', 'list-group-item', 'py-0', 'list-group-item-action', 'list-group-item-'+style, class_name);
    //   item.setAttribute('id', data.code+'-item')
    //   item.onclick = on_list_group_item_clicked;

    //   var text = document.createTextNode(data.name);

    //   var row = document.createElement("div");
    //   row.classList.add('row');

    //   var col1 = document.createElement("div");
    //   col1.classList.add('col-12')

    //   var checkbox = document.createElement("input");
    //   checkbox.classList.add('checkbox')
    //   checkbox.setAttribute('type',"checkbox");
    //   checkbox.setAttribute('code', data.code)
    //   checkbox.setAttribute('label_style', style);
    //   checkbox.setAttribute('name', data.name);
    //   checkbox.setAttribute('onclick', 'codeChecked(this)');
    //   col1.appendChild(checkbox);
    //   col1.appendChild(text);

    //   row.appendChild(col1)
    
    //   item.appendChild(row);
    //   return item
    // }

    // function generate_code_hierarchy(data, class_name, parent, style) {
    //   data.forEach(function(item) {
    //     var isParent = item.children && item.children.length > 0 && !item.children[0].is_image;
    //     var data_target = item.name.replace(/\s/g, '')

    //     if (isParent) {
    //       parent.appendChild(getTreeParentItem(item, class_name, data_target, style));
    //       var collapsing_children_item = document.createElement('div');
    //       collapsing_children_item.classList.add('list-group', 'collapse')
    //       collapsing_children_item.setAttribute('id', data_target)

    //       generate_code_hierarchy(item.children, class_name, collapsing_children_item, style);

    //       parent.appendChild(collapsing_children_item);
    //     } else {
    //       parent.appendChild(getTreeChildItem(item, class_name, style));
    //     }
    //   });
    // }

    function generate_code_list(data, class_name, parent, style) {
      data.forEach(function(item) {
        var isParent = item.children && item.children.length > 0 && !item.children[0].is_image;
        if (isParent) {
          generate_code_list(item.children, class_name, parent, style);
        } else {
          parent.appendChild(getListItem(item, class_name, style));
        }
      });
    }

    // generate_code_hierarchy(data.what_codes_hierarchies, 'tree_code_item', document.getElementById('all_codes'), 'primary');
    // generate_code_hierarchy(data.how_codes_hierarchies, 'tree_code_item', document.getElementById('all_codes'), 'danger');
    generate_code_list(data.what_codes_hierarchies, 'what_code_item', document.getElementById('what_codes'), 'primary');
    generate_code_list(data.how_codes_hierarchies, 'how_code_item', document.getElementById('how_codes'), 'danger');

    update()
});

// function on_list_group_item_clicked() {
//   $('.fa', this)
//     .toggleClass('fa-chevron-right')
//     .toggleClass('fa-chevron-down');
// }

function on_selected_item_clicked() {
  // We simulate a code on the associate item
  code = this.getAttribute('code') 
  document.getElementById(code+'-item').click()
}

function codeChecked(checkbox) {
  if (checkbox.checked) {
    // Add new element in the list
    var item = document.createElement('a');
    style = checkbox.getAttribute('label_style')
    item.classList.add('selected-code-item','badge', 'badge-'+style);
    item.innerHTML = checkbox.getAttribute('name');
    item.setAttribute('href','#');
    item.setAttribute('code', checkbox.getAttribute('code'));
    item.onclick = on_selected_item_clicked;
    document.getElementById('selected_codes').appendChild(item);
  }
  else {
    // Remove element in the list
    var children = document.getElementById('selected_codes').children
    for (var i = children.length - 1; i >= 0; --i) {
      if (children[i].getAttribute('code') == checkbox.getAttribute('code')) {
        children[i].remove();
      }
    }
  }

  update()
}

function update() {
  
  compute_occurences_dictionary();

  update_list_items_occurences("what_code_item", what_occurences_dict, blue_light_color, blue_dark_color);
  update_list_items_occurences("how_code_item", how_occurences_dict, red_light_color, red_dark_color);

  sort_list("what_codes", what_codes_sort_type);
  sort_list("how_codes", how_codes_sort_type);

  // Update some infos
  infos_item = document.getElementById('infos');
  total_percentage = Math.round(images.length/data.images.length*100.0);
  infos_item.innerHTML = 'Number of images: ' +images.length+'/'+data.images.length+' ['+total_percentage+'%]';

  update_images();
}

function compute_occurences_dictionary() {
  // Get the list of codes checked:
  selected_codes = [];
  var children = document.getElementById('selected_codes').children
  for (var i = children.length - 1; i >= 0; --i) {
    selected_codes.push(children[i].getAttribute('code'));
  }
  
  // Get the list of images containing these codes
  if (selected_codes.length > 0) {
    images = getDictValue(data.images_by_code_dict,selected_codes[0], []);
    for (var i = 1; i < selected_codes.length; i++) {
      images = images.filter(
        value => getDictValue(data.images_by_code_dict,selected_codes[i], []).includes(value))
    }
  } else {
    images = data.images;
  }

  // Compute occurences of all codes in images subset
  what_occurences_dict = {};
  how_occurences_dict = {};

  // Initalise dict with 0 for all codes
  for (var code of data.what_codes) {
    what_occurences_dict[code] = 0
  }
  for (var code of data.how_codes) {
    how_occurences_dict[code] = 0
  }

  // compute occurences
  for (var image of images) {
    image_what_codes = data.what_codes_coding_dict[image];
    image_how_codes = data.how_codes_coding_dict[image];
    for (var code of image_what_codes) {
      what_occurences_dict[code] = what_occurences_dict[code] + 1
    }
    for (var code of image_how_codes) {
      how_occurences_dict[code] = how_occurences_dict[code] + 1
    }
  }
}

function getDictValue(dict, key, default_value) {
  if (key in dict) {
    return dict[key]
  }
  return default_value
}

function update_list_items_occurences(item_type, occ_dict, clear_color, dark_color) {
  // Find the max occurence:
  max_occ = -1
  min_occ = images.length+1
  for (var key in occ_dict) {
    if (occ_dict[key] > max_occ){
      max_occ = occ_dict[key]
    }
    else if (occ_dict[key] < min_occ) {
      min_occ = occ_dict[key]
    }
  }

  var items = document.getElementsByClassName(item_type);
  for (child of items) {
    let code = child.getAttribute('code')
    let code_occurence = getDictValue(occ_dict, code, 0)
    var code_percentage = 0;
    if (images.length > 0) {
      code_percentage = Math.floor(code_occurence / images.length * 100.0);
    }

    ratio = 0
    if (max_occ-min_occ > 0) {
      ratio = (code_occurence-min_occ)/(max_occ-min_occ)
    }
    r = clear_color[0] + Math.floor(ratio * (dark_color[0]-clear_color[0]))
    g = clear_color[1] + Math.floor(ratio * (dark_color[1]-clear_color[1]))
    b = clear_color[2] + Math.floor(ratio * (dark_color[2]-clear_color[2]))

    child.setAttribute('style','background-color:rgb('+r+','+g+','+b+');');

    // Get the pourcentage element:
    percentage_item = document.getElementById(code+'-percentage');
    percentage_item.innerHTML = code_occurence+' ['+code_percentage + '%]';
    child.setAttribute('percentage',code_percentage);
    child.setAttribute('occurence',code_occurence);
  }
}

function sort_list(list_id, ordering_type) {
  var list = document.getElementById(list_id)
  var items = Array.prototype.slice.call(list.children);

  if (ordering_type == "percentage") {
    items = items.sort(function(a, b) {
      return parseInt(b.getAttribute('occurence')) - 
            parseInt(a.getAttribute('occurence'))
    });
  }
  else if (ordering_type == "alpha"){
    items = items.sort(function(a, b) {
      if(a.getAttribute('code') < b.getAttribute('code')) { 
        return -1; 
      }
      else {
        return 1;
      }
    }); 
  }

  for(var i = 0, len = items.length; i < len; i++) {
      var detatchedItem = list.removeChild(items[i]);
      list.appendChild(detatchedItem);
  }
}

function collapse_expand_func(verb) {
  item = document.getElementById('all_codes')
  if (verb == 'collapse') {
    $('.collapse').removeClass('show');
    $('.fa', item).removeClass('fa-chevron-down').addClass('fa-chevron-right')
  }
  else if (verb == 'expand') {
    $('.collapse').addClass('show');
    $('.fa', item).removeClass('fa-chevron-right').addClass('fa-chevron-down')
  }
}

function what_codes_sort_type_changed(type) {
  if (type != what_codes_sort_type) {
    what_codes_sort_type = type
    sort_list("what_codes", type)
  }
}

function how_codes_sort_type_changed(type) {
  if (type  != how_codes_sort_type) {
    how_codes_sort_type = type
    sort_list("how_codes", type)
  }
}

function update_images() {
  displayed_images = []
  if (images.length <= 10) {
    displayed_images = images;
  }
  else {
    displayed_images = getRandom(images, 10);
  }

  const parent = document.getElementById("images");
  while (parent.firstChild) {
    parent.firstChild.remove();
  }

  for (image of displayed_images) {
    // Image info
    let row_image_info = document.createElement('div');
    row_image_info.classList.add('row', 'row_image_info');
    
    let name_div = document.createElement('div');
    name_div.classList.add('col-10')
    let name_span = document.createElement('span');
    name_span.classList.add('badge', 'badge-secondary');
    split = image.split('-')
    let name = split[0] + ' - '+split[1];
    name_span.appendChild(document.createTextNode(image));
    name_div.appendChild(name_span);
    row_image_info.appendChild(name_div)

    let doi_div = document.createElement('div');
    doi_div.classList.add('col-2')
    var doi = document.createElement('a');
    doi.classList.add('badge', 'badge-primary');
    doi.setAttribute('href', getDictValue(data.dois_dict, image.split('-')[0]+'.pdf', '#'));
    doi.setAttribute('target', '_blank');
    doi.innerHTML = 'doi';
    doi_div.appendChild(doi);
    row_image_info.appendChild(doi_div);

    // Add the image
    var image_item = document.createElement('img');
    let image_path = (images_path + 'compressed-'+image).replace('png','jpg');
    image_item.setAttribute('src', image_path)

    parent.appendChild(row_image_info);
    parent.appendChild(image_item);
  }
}

// https://stackoverflow.com/questions/19269545/how-to-get-n-no-elements-randomly-from-an-array
function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

function refresh_images() {
  update_images()
}


















