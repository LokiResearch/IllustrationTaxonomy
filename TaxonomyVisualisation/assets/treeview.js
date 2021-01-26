// Author: Axel Antoine
// https://axantoine.com

// Loki, Inria project-team with Université de Lille
// within the Joint Research Unit UMR 9189 CNRS-Centrale
// Lille-Université de Lille, CRIStAL.
// https://loki.lille.inria.fr

// LICENCE: Licence.md

function tree_view() {



// controls = document.getElementById("controls")
// controls.innerHTML = ""
// controls.innerHTML += "<button onclick=\"expandAll()\">Expand All</button>"
// controls.innerHTML += "<input type=\"button\" value=\"Collapse all\">"


function expandAll(){
    expand(root); 
    update(root);
}

function collapseAll(){
    root.children.forEach(collapse);
    collapse(root);
    update(root);
}


// Set the dimensions and margins of the diagram
var zoom = 0.90
var el_id = 'chart';
var obj = document.getElementById(el_id);
var divWidth = obj.offsetWidth * zoom;
var divHeight = obj.offsetHeight * zoom;
var margin = {top: 0, right: 0, bottom: 0, left:(obj.offsetWidth-divWidth)/2},
  width = divWidth,
  height = divHeight - margin.top - margin.bottom,
  formatNumber = d3.format(","),
  transitioning;

var node_r = 10;

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
d3.selectAll("svg > *").remove();


var svg = d3.select('#'+el_id)
  .append("svg")
  .attr("width", width + margin.right + margin.left)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate("+ margin.left + "," + margin.top + ")");

var i = 0,
    duration = 500,
    root;

// declares a tree layout and assigns the size
var treemap = d3.tree().size([height, width]);

function remove_images(root) {
  var new_children = [];
  root.children.forEach( function(child) {
    if (!child.is_image) {
      child = remove_images(child);
      new_children.push(child);
    } 
  });
  root.children = new_children;
  return root;
}



// Assigns parent, children, height, depth
d3.json("../data/data.json", function(data) {

  data = remove_images(data.codes_hierarchy)

  var root = d3.hierarchy(data, function(d) { return d.children; });
root.x0 = height / 2;
root.y0 = 0;

// Collapse after the second level
root.children.forEach(collapse);

function update(source) {

  // Assigns the x and y position for the nodes
  var treeData = treemap(root);

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  // Normalize for fixed-depth.
  nodes.forEach(function(d){ d.y = d.depth * 180});

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = svg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new modes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })

  nodeEnter
    .on('click', click)
    .on('mouseover', mouseover)
    .on('mouseleave', mouseleave)

  // Add Circle for the nodes
  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      });

  // Add labels for the nodes
  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", function(d) {
          return d.children || d._children ? -13 : 13;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(function(d) { return d.data.name; });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")";
     });

  // Update the node attributes and style
  nodeUpdate.select('circle.node')
    .attr('r', node_r)
    .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#fff";
    })
    .attr('cursor', 'pointer');


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  // On exit reduce the node circles size to 0
  nodeExit.select('circle')
    .attr('r', 1e-6);

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = svg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

update(root);


  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    update(d);
    svg.selectAll('.svg-tooltip').remove();
  }

  // Collapse the node and all it's children
  function collapse(d) {
    if(d.children) {
      d._children = d.children
      d._children.forEach(collapse)
      d.children = null
    }
  }

  function expand(d){   
    var children = (d.children)?d.children:d._children;
    if (d._children) {        
        d.children = d._children;
        d._children = null;       
    }
    if(children)
      children.forEach(expand);
  }


  function mouseover(d) {
    text = "unknown"
    if (d.data.textinfo)
      text = d.data.textinfo

    var tooltip = svg.append('foreignObject')
      .attr('width',300)
      .attr('class','svg-tooltip');

    var div = tooltip.append('xhtml:div')
      .attr('class', 'tooltip')
      .attr('id', 'tooltip')
      .html(text);


    h = document.getElementById('tooltip').getBoundingClientRect().height
    
    tooltip
      .attr('x',Math.max(0,d.y-150))
      .attr('y',Math.max(0,d.x - h - node_r*1.5))
      .attr('height',h)
      .style("opacity", 0)

    tooltip
      .transition()
      .duration(500)
      .style("opacity", 1)
  }

  function mouseleave(d) {
    svg.selectAll('.svg-tooltip').remove();
  }

});



}