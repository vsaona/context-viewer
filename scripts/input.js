Array.prototype.last = function(){return this[this.length - 1];};
Array.prototype.first = function(){return this[0];};
window.addedInputGenomaisEven = true;
window.genomasAmount = 1;
window.contextSources = [];
window.colors = [];
window.allGeneNames = [];
window.differentColors = 0;

// drag-and-drop functionality
function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

/* I wish there was a more efficient way to do this, I would like to re-think this.
 * Probably integrating it with the rest of the analysis would help.
 */
function assignColors(contig) {
  console.log("[AssignColors] assigning colors");
  
  for(var j = 0; j < contig.genes.length; j++) {
    var gene = contig.genes[j];
    if(allGeneNames.includes(gene.name) || allGeneNames.includes(gene.product)) {
      for(var k = 0; k < colors.length; k++) {
        if(colors[k].names.includes(gene.name) || colors[k].names.includes(gene.product)) {
          colors[k].count++;
          if(gene.name && !colors[k].names.includes(gene.name)) {
            console.log(gene.name);
            console.log("name");
            colors[k].names.push(gene.name);
            allGeneNames.push(gene.name);
          }
          if(gene.product && !colors[k].names.includes(gene.product)) {
            console.log(gene.product);
            console.log("product");
            colors[k].names.push(gene.product);
            allGeneNames.push(gene.product);
          }
        }
      }
    }
    else {
      if(gene.name)
        allGeneNames.push(gene.name);
      if(gene.product)
        allGeneNames.push(gene.product);
      if(gene.interest) {
        colors.push({
          names: [gene.name, gene.product],
          count: 1,
          color: "#BD3B32"
        });
      } else if(gene.product == "hypothetical protein" || (!gene.name && ! gene.product)) {
        colors.push({names: [gene.name, gene.product],
          count: 1,
          color: "#C7C7C7"});
      } else {
        colors.push({
          names: gene.name ? (
            gene.product ?
              [gene.name, gene.product]
            :
              [gene.name]
          ):
            [gene.product],
          count: 1
        });
      }
    }
  }
  
  for(var k = 0; k < colors.length; k++) {
    if(colors[k].count == 1 && !colors[k].color) {
      //colors[k].names.forEach( name => {
      //  allGeneNames.splice(allGeneNames.indexOf(name), 1);
      //});
    } else {
      colors[k].color = colors[k].color ?? Color.hsv2hex({h:differentColors++ * 0.618033988749895 % 1.0 * 360, s:0.5, v:1});
    }
  }
  for(var j = 0; j < contig.genes.length; j++) {
    if((contig.genes[j].name && allGeneNames.includes(contig.genes[j].name)) || (contig.genes[j].product &&allGeneNames.includes(contig.genes[j].product))) {
      for(var k = 0; k < colors.length; k++) {
        if((contig.genes[j].name && colors[k].names.includes(contig.genes[j].name)) || ( contig.genes[j].product && colors[k].names.includes(contig.genes[j].product))) {
          contig.genes[j].color = colors[k].color;
        }
      }
    }
  }
  return(contig);
}

function addGenoma() {
  window.contextSources.push({"genomaName": "loading..."})
  var clone = newGenomaData(genomasAmount);
  var hr = document.createElement("div");
  hr.classList.add("hr");
  hr.innerHTML = `<hr>Context ` + (genomasAmount + 1);
  if (addedInputGenomaisEven) {
    clone.classList.add("mdc-theme--secondary-bg");
    hr.classList.add("mdc-theme--secondary-bg");
  }
  addedInputGenomaisEven = !addedInputGenomaisEven;
  document.getElementById("genomaList").appendChild(hr);
  document.getElementById("genomaList").appendChild(clone);
  genomasAmount++;

  [...clone.getElementsByTagName("mwc-textfield")].forEach(element => {
    element.layout();
  });
}

function changeGenomaSource(value, id) {
  if (!value) return;
  if (id == (window.genomasAmount - 1).toString()) {
    addGenoma();

  }
  var element;
  element = document.getElementById("genomaList").getElementsByClassName("genomaData")[id];
  for (let el of element.getElementsByClassName("extraInput")[0].children) {
    el.classList.add("invisible");
    if ((value == "file" || value == "accesion") && el.classList.contains("genomaBoundaries")) {
      el.classList.remove("invisible");
    } else if (value == "locus" && el.classList.contains("genomaContext")) {
      el.classList.remove("invisible");
    }
  }
  var textFields = element.getElementsByTagName("mwc-textfield");
  for (var i = 0; i < textFields.length; i++) {
    textFields[i].focus();
    textFields[i].blur();
  }
  for (let el of element.children[0].children) {
    if (el.classList.contains("genomaSpec")) {
      el.classList.add("invisible");
      if (el.classList.contains(value)) {
        el.classList.remove("invisible");
        el.focus();
      }
    }
  }
  //if(value == "file") {
  //  updateFile(value,id);
  //}
}

function selectFile(id) {
  document.getElementById('fileSelectButton' + id).click();
}

async function updateFile(value, id) {
  var path = value.split('\\');
  //document.getElementById('fileName' + id).innerText = path[path.length - 1];
  var files = document.getElementById("fileSelectButton" + id).files;
  for(var fileIndex = 0; fileIndex < files.length; fileIndex++) {
    document.getElementById('fileName' + id).innerText = path.last();
    //var isRegionSpecified = false;
    var text = (await files[fileIndex].text()).split('\n');
    contextSources[id].locusBegin = document.getElementById('desde' + id).value;
    contextSources[id].locusEnd = document.getElementById('hasta' + id).value;
    contextSources[id].contigs = [];
    contextSources[id].activeContig = 0;
    newContig = true;
    features = false;
    interestGenes = false;
    var skipThisFeature = false;
    var propertyType;
    var propertyContent;
    for (var lineIndex = 0; lineIndex < text.length; lineIndex++) {
      var line = text[lineIndex];
      // Extracting key data from the genoma
      if(!line.match(/^\s*$/) && newContig) {
        newContig = false;
        contextSources[id].contigs.push({});
      }

      if(line.match(/^\s*\/\/\s*/))
        newContig = true;
        
      else if(line.match(/\s*ORGANISM\s+(.*)/))
        contextSources[id].contigs.last().genomaName = line.match(/\s*ORGANISM\s+(.*)/)[1];
      else if(line.match(/\s*DEFINITION\s+(.*)/)) {
        contextSources[id].genomaName = line.match(/\s*DEFINITION\s+(.*)/)[1];
        contextSources[id].contigs.last().genomaDefinition = contextSources[id].genomaName;
        contextSources[id].contigs.last().name = contextSources[id].genomaName;
        
      } else if(line.match(/\s*ACCESSION\s+(.*)/))
        contextSources[id].contigs.last().genomaAccession = line.match(/\s*ACCESSION\s+(.*)/)[1];
      else if(line.match(/\s*FEATURES\s+(.*)/)) {
        features = true;
        interestGenes = true;
        contextSources[id].contigs.last().genes = [];
        last_position = [0,0];
      }
      // Extracting genes data
      if(features) {
        if(interestGenes) {
          if(line.match(/^..\s{3}(source\s{10}|region\s{10}|protocluster\s{3}|proto_core\s{5}|cand_cluster\s{3}|Misc.{11})/i)) {
            skipThisFeature = true;
          } else if(line.match(/^..\s{3}\w+\s{2}/)) {
            propertyType = null;
            skipThisFeature = false;
            if(line.match(/^..\s{3}\w+\s{2}.*?\d+\.\.(?:\d+\s,\s\d+\.\.)?\d+/)) {
              
              position = line.match(/^..\s{3}\w+\s{2}.*?(\d+)\.\.(?:\d+\s,\s\d+\.\.)?(\d+)/);
              if(position[1] != last_position[0] && position[2] != last_position[1]) {
                contextSources[id].contigs.last().genes.push({start: position[1], end: position[2], type: []});
                last_position = [position[1], position[2]];
              }
            }
            contextSources[id].contigs.last().genes.last().type.push(line.match(/^..\s{3}(\w+)\s{2}/)[1]);
          } else if(line.match(/^..\s{19}\/(?:\w+)="(?:.*)/) && !skipThisFeature) {
            propertyType = line.match(/^..\s{19}\/(\w+)="(.*)/)[1];
            if(line.match(/^..\s{19}\/(?:\w+)="(?:.*)"/)) {
              propertyContent = line.match(/^..\s{19}\/(\w+)="(.*)"/)[2];
              contextSources[id].contigs.last().genes.last()[propertyType] = propertyContent;
              if(propertyType == "gene") {
                contextSources[id].contigs.last().genes.last().name = propertyContent;
              } else if((!contextSources[id].contigs.last().genes.last().name ||
                        contextSources[id].contigs.last().genes.last().name != contextSources[id].contigs.last().genes.last().gene) &&
                        propertyType == "locus_tag") { // TODO: Not sure this actually works, please test it.
                contextSources[id].contigs.last().genes.last().name = propertyContent;
              } else if((!contextSources[id].contigs.last().genes.last().name ||
                        (contextSources[id].contigs.last().genes.last().name != contextSources[id].contigs.last().genes.last().gene && 
                        contextSources[id].contigs.last().genes.last().name != contextSources[id].contigs.last().genes.last().locus_tag)) && 
                        propertyType == "product") {
                contextSources[id].contigs.last().genes.last().name = propertyContent;
              }
              propertyType = null;
            } else {
              propertyContent = line.match(/^..\s{19}\/(\w+)="(.*)/)[2];
              contextSources[id].contigs.last().genes.last()[propertyType] = propertyContent;
            }
              
          } else if(line.match(/^..\s{19}(?:[^\s]*)/) && !skipThisFeature && propertyType) {
            propertyContent = propertyContent + (propertyType == "translation" ? "" : " " ) + line.match(/^..\s{19}(.*)/)[1];
            if(propertyContent.match(/"$/)) {
              contextSources[id].contigs.last().genes.last()[propertyType] = propertyContent.slice(0, propertyContent.length - 1);
              propertyType = null;
            } else {
              contextSources[id].contigs.last().genes.last()[propertyType] = propertyContent;
            }
          }

          
          // Ignore everything below
          
          // if(contextSources[id]["locusBegin"] && line.includes(contextSources[id]["locusBegin"])) {
          //   interestGenes = true;
          // } else if(!contextSources[id]["locusBegin"] && line.match(/^..\s{3}\w+\s{2}/)) {
          //   if(!line.match(/^..\s{3}(source\s{10}|region\s{10}|protocluster\s{3}|proto_core\s{5}|cand_cluster\s{3}|Misc\s{11})/)) {
          //     contents = line + "\n";
          //     interestGenes = true;
          //   }
          // } else if(line.match(/^..\s{3}\w+\s{2}.*\d+\.\./)){
          //   contents = line + "\n";
          // }
        // } else {
        //   if(contextSources[id]["locusEnd"] && line.includes(contextSources[id]["locusEnd"])) {
        //     contents = contents + line + "\n";
        //     lastGene = true;
        //   } else if(lastGene && (line.match(/^..\s{3}\w+\s{2}/) || line.match(/^..[^\s]/))) {
            
        //     if(line.match(/^..\s{3}\w+\s{2}/) && !contents.includes(line.substring(20))){
        //       break;
        //     }
        //     contents = contents + line + "\n";
        //   } else if(line.match(/^..[^\s]/) || line.match(/^\/\//)) {
        //     break;
        //   } else {
        //     contents = contents + line + "\n";
        //   }
        }
      } else { //isRegionSpecified
        // var featureDefinition = line.match(/^..\s{3}\w+\s{2}.*?(\d+)\.\.(?:\d+\s,\s\d+\.\.)?(\d+)/);
        // if(!interestGenes) {
        //   if(featureDefinition) {
        //     if(parseInt(featureDefinition[1]) >= contextSources[id]["locusBegin"]) {
        //       interestGenes = true;
        //       contents = line + "\n";
        //     }
        //   }
        // } else {
        //   if(featureDefinition && parseInt(featureDefinition[2]) > contextSources[id]["locusEnd"]) {
        //     interestGenes = false;
        //     break;
        //   } else {
        //     contents = contents + line + "\n";
        //   }
        // }
          
      }
    }
  }
  window.genomas = [];
  for(var genomaIndex = 0; genomaIndex < contextSources.length; genomaIndex++) {
    window.genomas.push(assignColors(contextSources[genomaIndex].contigs[contextSources[genomaIndex].activeContig]));
  }
  document.getElementById("canvas").innerHTML="";
  window.minStart = 0;
  window.maxEnd = 0;
  drawAll(window.genomas);
}

// drag-and-drop functionality
function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}
function highlight(e) {
  if(!this.classList.contains("highlight")) {
    this.classList.add("highlight");
  }
}
function unhighlight(e) {
  if(this.classList.contains("highlight")) {
    this.classList.remove("highlight");
  }
}

function handleDrop(e) {
  if(e.dataTransfer.files.length > 1) {
    alert("Sorry, but you should select the files one by one.");
  } else if(this.id == "genomaSearchData" && e.dataTransfer.files.item(0).name.match(/.*\.f.*/)) {
    if(e.dataTransfer.files.item(0).size < 2000) {
      e.dataTransfer.files.item(0).text().then(function (text) {
        document.getElementById("genomaSearchSourceType").value = "fasta";
        document.getElementById("fastaSearchSource").value = text;
        document.getElementById("fastaSearchSource").layout();
      });
    } else {
      alert("You should enter just ONE protein fasta sequence!");
    }
  } else {
    this.getElementsByClassName("genomaSourceType")[0].value = "file";
    this.getElementsByClassName("genomaSourceType")[0].onchange();
    this.getElementsByClassName("form-control-file")[0].files = e.dataTransfer.files;
    this.getElementsByClassName("form-control-file")[0].onchange();
  }
}

function checkAndSend() {
  if(!document.getElementById('tab-bar').activeIndex) {
    var sourceType = document.getElementById('genomaSearchSourceType').value;
    if(sourceType == "file") {
      if(!document.getElementById("fileSelectButtonSearchSource").files.length) {
        document.getElementById("errorSnackbar").labelText = "You should specify your query first.";
        document.getElementById("errorSnackbar").show();
        document.getElementById("fileSearchSourceButton").focus();
        return;
      }
      if(!document.getElementById("searchFileLocusTag").value || !document.getElementById("searchFileLocusTag").checkValidity()) {
        document.getElementById("errorSnackbar").labelText = "You should specify your query sequence first.";
        document.getElementById("errorSnackbar").show();
        document.getElementById("searchFileLocusTag").focus();
        return;
      }
    } else if(sourceType == "accesion") {
      if(!document.getElementById("accesionSearchSource").value || !document.getElementById("accesionSearchSource").checkValidity()) {
        document.getElementById("errorSnackbar").labelText = "You should specify your query first.";
        document.getElementById("errorSnackbar").show();
        document.getElementById("accesionSearchSource").focus();
        return;
      } else if(!document.getElementById("searchFileLocusTag").value || !document.getElementById("searchFileLocusTag").checkValidity()) {
        document.getElementById("errorSnackbar").labelText = "You should specify your query sequence first.";
        document.getElementById("errorSnackbar").show();
        document.getElementById("searchFileLocusTag").focus();
        return;
      }
    } else if(sourceType == "fasta") {
      if(!document.getElementById("fastaSearchSource").value) {
        document.getElementById("errorSnackbar").labelText = "You should specify your query sequence first.";
        document.getElementById("errorSnackbar").show();
        document.getElementById("fastaSearchSource").focus();
        
        return;
      }
    }
    if(!document.getElementById("contextsQuantity").checkValidity()) {
      document.getElementById("errorSnackbar").labelText = "This is not a valid number!";
      document.getElementById("errorSnackbar").show();
      document.getElementById("contextsQuantity").focus();
      return;
    } else if(document.getElementById("useIncludeOnly").checked && !document.getElementById("includeOnly").checkValidity()) {
      document.getElementById("errorSnackbar").labelText = "Insert only one Taxonomic group!";
      document.getElementById("errorSnackbar").show();
      document.getElementById("includeOnly").focus();
      return;
    } else if(!document.getElementById("minCoverage").checkValidity()) {
      document.getElementById("errorSnackbar").labelText = "This is not a valid percentage!";
      document.getElementById("errorSnackbar").show();
      document.getElementById("minCoverage").focus();
      return;
    } else if(!document.getElementById("minIdentity").checkValidity()) {
      document.getElementById("errorSnackbar").labelText = "This is not a valid percentage!";
      document.getElementById("errorSnackbar").show();
      document.getElementById("minIdentity").focus();
      return;
    }
    document.getElementById('submitSearchHomologous').click();
  } else {
    var tab = document.getElementById('genomaList').getElementsByTagName("mwc-textfield")
    for(let field of tab) {
      if(!field.checkValidity()) {
        document.getElementById("errorSnackbar").labelText = "There is something wrong!";
      document.getElementById("errorSnackbar").show();
        field.focus();
        return;
      }
    }
    document.getElementById('submitMyContexts').click();
  }
}