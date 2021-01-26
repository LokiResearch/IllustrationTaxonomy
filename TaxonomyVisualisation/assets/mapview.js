// Author: Axel Antoine
// https://axantoine.com

// Loki, Inria project-team with Université de Lille
// within the Joint Research Unit UMR 9189 CNRS-Centrale
// Lille-Université de Lille, CRIStAL.
// https://loki.lille.inria.fr

// LICENCE: Licence.md

/**
* Taxonomy of Trace Figures
*
* Inspired by the work of Guglielmo Celata (2017) based on a port
* to D3 v4 of Jacques Jahnichen's Block, using a budget data
* see: http://bl.ocks.org/JacquesJahnichen/42afd0cde7cbf72ecb81
*
**/

function map_view() {

var zoom = 0.90
var el_id = 'chart';
var obj = document.getElementById(el_id);
var divWidth = obj.offsetWidth * zoom;
var divHeight = obj.offsetHeight * zoom;
console.log(divWidth, divHeight)
var margin = {top: 0, right: 0, bottom: 0, left:(obj.offsetWidth-divWidth)/2},
  width = divWidth,
  height = divHeight - margin.top - margin.bottom,
  formatNumber = d3.format(","),
  transitioning;

var images_path = '../data/images/'
var v_space = 10;
var nav_bar_height = 20;
var parent_title_height = 30;
var infoText_height = 20;
var child_title_height = 20;
var chart_y_pos = margin.top+nav_bar_height+infoText_height+v_space*2;

// sets x and y scale to determine size of visible boxes
var xscale = d3.scaleLinear()
.domain([0, width])
.range([0, width]);

var yscale = d3.scaleLinear()
.domain([0, height])
.range([0, height]);

var current_node;
var treemap = d3.treemap()
      .size([width, height])
      .round(true)

d3.selectAll("svg > *").remove();
var svg = d3.select('#'+el_id).append("svg")
    .attr("xmlns","http://www.w3.org/2000/svg") 
    .attr('xmlns:xlink',"http://www.w3.org/1999/xlink")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
  // .style("margin-left", -margin.left + "px")
  // .style("margin.right", -margin.right + "px")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + "0"+ ")")
    .style("shape-rendering", "crispEdges");

var navmenu = svg.append("g")
    .attr("class", "navmenu");

navmenu.append("rect")
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", nav_bar_height)

navmenu.append("text")
    .attr("x", 6)
    .attr("y", margin.top+3)
    .attr("dy", ".75em");

var infoText = svg.append("a")
    .attr("class", "infotext");

infoText.append("rect")
    .attr("y",margin.top+nav_bar_height+v_space)
    .attr("width", width)
    .attr("height", infoText_height)

infoText.append("text")
    .attr("x", 6)
    .attr("y", 3+margin.top + nav_bar_height+v_space)
    .attr("width", width)
    .attr("dy", ".75em");


d3.json("../data/data.json", function(data) {
  var root = d3.hierarchy(data.codes_hierarchy);
  treemap(root
      .count()
      .sort(function (a, b) {return b.value - a.value})
  );


//     window.onresize = function () {
//         setTimeout(function() {

//         console.log("Resize :", current_node)
//         width = obj.offsetWidth * zoom;
//         height = obj.offsetHeight * zoom;
//         svg.attr("height",height)
//         svg.attr("width",width)
//         xscale = d3.scaleLinear()
// .range([0, width]);

// yscale = d3.scaleLinear()
// .range([0, height]);
//         display(current_node);
//     },100)}


    display(root);

    function display(node) {

        current_node = node

        // Navigation bar begin

        // write text into navmenu
        // and activate click's handler
        navmenu
            .datum(node.parent)
            .on("click", transition)
            .select("text")
            .text(name(node));

   
        infoText.attr('xlink:href', null)
                .data(node.parent)
        if (node.data.is_image) {
            if (node.data.doi)
                infoText
                    .attr('xlink:href',node.data.doi)
                    .select("text")
                    .text(node.data.doi);
            else
                infoText
                    .select("text")
                    .text('doi not found');
        
        } else {
            infoText
                .select("text")
                .text(node.data.textinfo);
        }

        // var g1 = svg.insert("g", ".navmenu")
        //     .datum(node)
        //     .attr("class", "depth")

        var g1 = svg.append("g")
                .attr("transform","translate(0,"+chart_y_pos+")")

        // Navigation bar end



        display_node(node, g1)




        function display_node(node, group)  {

            if (node.children) {
                node.children.forEach( function(parent) {
                    display_parent(parent, group, "xMidYMid slice");
                });
            }
            else {
                display_parent(node, group, "xMidYMid meet")
            }           
        }

        function display_parent(parent, group, imgAspectRatio) { 

            parent_group = group.append("g")
                .attr("class", "parent")
                .attr("title", parent.data.name)
                .datum(parent)
                .on("click", transition)
                                   
            parent_group
                .append("rect")
                .attr("class","parent_rect").call(parent_rect)

            parent_group
                .append("foreignObject")
                .call(parent_title)
                .attr("class", "parent_title")
                .append("xhtml:div")
                .html(function (d) {
                        title = '<p class="title"> ' + parent.data.name
                        if (!d.data.is_image)
                            title +='  [' +formatNumber(parent.value) +']'
                    return title+'</p>'
                })
                .attr("class", "textdiv parent_title")

            if (parent.children) {
                parent.children.forEach( function(child) {
                    display_child(child, parent_group, imgAspectRatio)
                });
            }
            else {
                display_child(parent, parent_group, imgAspectRatio)
            }

            parent_group
                .append("rect")
                .attr("class","hover_rect").call(parent_rect)
        }

        function list_image_nodes(node) {
            var image_nodes = new Set();
            function rec_list_image_nodes(node) {
                if (node.data.is_image) {
                    image_nodes.add(node);
                }
                else {
                    node.children.forEach(function(child) {
                        rec_list_image_nodes(child);
                    });
                }
            }
            rec_list_image_nodes(node);

            return image_nodes
        }

        function display_child(node, group, imgAspectRatio) {
            node_group = group.append("g")
                .attr("class", "child")
                .attr("title", node.data.name)
                .datum(node)
                   
            r = node_group
                .append("rect")
                .attr("class","child_rect").call(child_rect);  
           
            display_node_images(node, node.parent, node_group, "child_rect", child_rect, imgAspectRatio)

            if (!node.data.is_image)
            {
                node_group
                    .append("foreignObject")
                    .call(child_title)
                    .attr("class", "child_title")
                    .append("xhtml:div")
                    .html(function (d) {
                        title = '<p class="title"> ' + node.data.name
                        if (!d.data.is_image)
                            title +='  [' +formatNumber(node.value) +']'
                        return title+'</p>'                    })
                    .attr("class", "textdiv child_title")
            }
        }


        function display_node_images(node, parent, group, class_id, func, imgAspectRatio) {
            images_group = group.append("g")
                .attr("class","images")

            let image_nodes = list_image_nodes(node);

            image_nodes.forEach( function(image_node) {
                let image_path = (images_path + 'compressed-'+image_node.data.path).replace('png','jpg');
                let img = node_group.append('image')
                    .attr("xlink:href", image_path)
                    .attr("preserveAspectRatio", imgAspectRatio)
                    .datum({
                        "x0": image_node.x0,
                        "y0": image_node.y0,
                        "x1": image_node.x1,
                        "y1": image_node.y1,
                        "parent": parent,
                        "data": image_node.data
                    });

                img.attr("class",class_id).call(func)
                
            });
        }

        function transition(d) {

            if (transitioning || !d) return;
            transitioning = true;

            var g2 = display(d),
              t1 = g1.transition().duration(300),
              t2 = g2.transition().duration(300);
            // Update the domain only after entering new elements.
            xscale.domain([d.x0, d.x1]);
            yscale.domain([d.y0, d.y1]);
            // Enable anti-aliasing during the transition.
            svg.style("shape-rendering", null);
            // Draw child nodes on top of parent nodes.
            // svg.selectAll(".depth").sort(function (a, b) {
            //     return a.depth - b.depth;
            // });
            // Fade-in entering text.
            // g2.selectAll("text").style("fill-opacity", 0);
            // g2.selectAll("foreignObject div").style("display", "none");
            /*added*/
            // Transition to the new view.
            // t1.selectAll("text").call(text).style("fill-opacity", 0);
            // t2.selectAll("text").call(text).style("fill-opacity", 1);

              

            // t1.selectAll("rect").call(rect);
            // t2.selectAll("rect").call(rect);

            t1.selectAll(".parent_rect").call(parent_rect);
            t2.selectAll(".parent_rect").call(parent_rect);
            t1.selectAll(".hover_rect").call(parent_rect);
            t2.selectAll(".hover_rect").call(parent_rect);
            t1.selectAll(".parent_title").call(parent_title);
            t2.selectAll(".parent_title").call(parent_title);

            t1.selectAll(".child_rect").call(child_rect);
            t2.selectAll(".child_rect").call(child_rect);
            t1.selectAll(".child_title").call(child_title);
            t2.selectAll(".child_title").call(child_title);


            /* Foreign object */
            // t1.selectAll(".textdiv").style("display", "none");
            // /* added */
            // t1.selectAll(".foreignobj").call(foreign);
            // /* added */
            // t2.selectAll(".textdiv").style("display", "block");
            // /* added */
            // t2.selectAll(".foreignobj").call(foreign);
            // /* added */

            // t1.selectAll(".child_subrect").call(child_subrect);
            // t2.selectAll(".child_subrect").call(child_subrect);

            // t1.selectAll(".parent_subrect").call(parent_subrect);
            // t2.selectAll(".parent_subrect").call(parent_subrect);

            // Remove the old node when the transition is finished.
            t1.on("end.remove", function(){
              this.remove();
              transitioning = false;
            });
        }
        return g1;
    }

   
  // function text(text) {
  //     text.attr("x", function (d) {return x(d.x0);})
  //         .attr("y", function (d) {return y(d.y0);});
  // }

  function rect(rect) {
      rect
        .attr("transform", function(d) {
            return "translate(" + xscale(d.x0) + "," + yscale(d.y0) + ")";
        })
        .attr("width", function(d) {
            return xscale(d.x1) - xscale(d.x0);
        })
        .attr("height", function(d) {
            return yscale(d.y1) - yscale(d.y0);
        });
  }

    function parent_rect(rect) {
        rect
            .attr("x", function (d) {
                return xscale(d.x0);
            })
            .attr("y", function (d) {
                return yscale(d.y0);
            })
            .attr("width", function (d) {
                return Math.max(0, xscale(d.x1) - xscale(d.x0));
            })
            .attr("height", function (d) {
                return Math.max(0, yscale(d.y1) - yscale(d.y0));
            })

    }

    function parent_title(rect) {

        rect.call(parent_rect)
            .attr("height", function (d) {
                return Math.max(0, parent_title_height);
            })
    }

    function child_rect(rect) {
        rect
            .attr("x", function (d) {
                return xscale(d.x0);
            })
            .attr("y", function (d) {
                H = yscale(d.parent.y1) - yscale(d.parent.y0);
                ratio = (parent_title_height)/H;
                h = yscale(d.parent.y1) - yscale(d.y0);
                return yscale(d.y0)+h*ratio;
            })
            .attr("width", function (d) {
                return Math.max(0, xscale(d.x1) - xscale(d.x0));
            })
            .attr("height", function (d) {
                H = yscale(d.parent.y1) - yscale(d.parent.y0);
                ratio = (parent_title_height)/H;
                return Math.max(0,(yscale(d.y1) - yscale(d.y0))*(1-ratio));
            })
    }

     function child_title(rect) {
        rect.call(child_rect)
            .attr("height", function (d) {
                return Math.max(0, child_title_height);
            })
    }

  function name(d) {
      var res = "";
      var sep = " > ";
      d.ancestors().reverse().forEach(function(i){
          res += i.data.name + sep;
      });
      return res
          .split(sep)
          .filter(function(i){
              return i!== "";
          })
          .join(sep);
  }

});

}