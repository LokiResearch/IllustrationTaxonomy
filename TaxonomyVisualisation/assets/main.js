// Author: Axel Antoine
// https://axantoine.com

// Loki, Inria project-team with Université de Lille
// within the Joint Research Unit UMR 9189 CNRS-Centrale
// Lille-Université de Lille, CRIStAL.
// https://loki.lille.inria.fr

// LICENCE: Licence.md

function OnLoad() {
  var url = new URLSearchParams(window.location.search);
  if (url.has('view')) {
    view_type = url.get('view');
    document.getElementById(view_type).checked = true;
    if (view_type == 'map')
      map_view();
    else if (view_type == 'tree')
      tree_view();
  }
  else {
    map_view();
  }
}

function VisuChanged() {
  var url = new URLSearchParams(window.location.search);

  if (document.getElementById("tree").checked) {
    url.set('view', 'tree');
  }
  else if (document.getElementById("map").checked){ 
    url.set('view', 'map');
  }

  window.location.search = url.toString(); 
}