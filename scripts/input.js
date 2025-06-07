Array.prototype.last = function(){return this[this.length - 1];};
Array.prototype.first = function(){return this[0];};
window.addedInputGenomaisEven = true;
window.genomasAmount = 1;
window.contextSources = []

// drag-and-drop functionality
function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
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
            property_type = null;
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
            property_type = line.match(/^..\s{19}\/(\w+)="(.*)/)[1];
            if(line.match(/^..\s{19}\/(?:\w+)="(?:.*)"/)) {
              property_content = line.match(/^..\s{19}\/(\w+)="(.*)"/)[2];
              contextSources[id].contigs.last().genes.last()[property_type] = property_content;
              property_type = null;
            } else {
              property_content = line.match(/^..\s{19}\/(\w+)="(.*)/)[2];
              contextSources[id].contigs.last().genes.last()[property_type] = property_content;
            }
              
          } else if(line.match(/^..\s{19}(?:[^\s]*)/) && !skipThisFeature && property_type) {
            property_content = property_content + (property_type == "translation" ? "" : " " ) + line.match(/^..\s{19}(.*)/)[1];
            if(property_content.match(/"$/)) {
              contextSources[id].contigs.last().genes.last()[property_type] = property_content.slice(0,property_content.length-1);
              property_type = null;
            } else {
              contextSources[id].contigs.last().genes.last()[property_type] = property_content;
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
    window.genomas.push(contextSources[genomaIndex].contigs[contextSources[genomaIndex].activeContig]);
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