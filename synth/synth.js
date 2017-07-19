const KEYS = {
  "c_major_garbage": [65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66],
  "dj_barakas": [],
  "depressed_daikon": []
}

var release = 0.15;
var speed = 200;

class Oscillator {
  constructor(pitch, context, masterVolume) {
    this.context = context;
    this.vco = context.createOscillator();
    this.vco.frequency.value = pitch;
    this.vca = context.createGain();
    this.vco.connect(this.vca);
    this.vca.connect(masterVolume);
    this.vco.type = "square";
    this.vco.start();
    this.vca.gain.value = 0;
  }

  trigger(){
    // this.vca.gain.value = 1;
    this.vca.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
    this.vca.gain.setTargetAtTime(0, this.context.currentTime + 0.01, release);
  }
}

class Sequencer {
  constructor(vcoCount, key, sequenceData) {
    this.vcoCount = vcoCount;
    this.oscillators = [];
    this.key = key;
    this.sequenceData = sequenceData;
    this.currentStep = 0;
    this.context = new window.AudioContext();
    this.masterVolume = this.context.createGain();
    // this.panner = this.context.createStereoPanner();
    // this.lfoFreqGain = this.context.createGain();
    // this.lfo = this.context.createOscillator();
    this.filter = this.context.createBiquadFilter();
    this.filter.frequency.value = 10000;
    this.genVCOs();
    this.masterVolume.gain.value = 0;
    this.masterVolume.connect(this.filter);
    this.filter.connect(this.context.destination);
  }
  genVCOs() {
    for(var i=1; i <= this.vcoCount; i++) {
      var pitch = KEYS['c_major_garbage'][i-1];
      var osc = new Oscillator(pitch, this.context, this.masterVolume)
      // var vco = context.createOscillator(pitch, context);
      // vco.frequency.value = KEYS['c_major'][i-1]; // key value
      // vco.type = "square";
      // vco.connect(vca);
      // vco.start();
      this.oscillators.push(osc);
    }
  }

  toggle(id){
    var str = this.sequenceData.split("")
    str[id] = str[id] === "1" ? "0" : "1"
    this.sequenceData = str.join("")
    $.ajax({
      url: `http://localhost:3000/sequences/${this.sequenceId}`,
      type: "PUT",
      data: {
        title: this.sequenceTitle,
        data: this.sequenceData,
        speed: 200,
        width: 300
      }
    }).done(function(data){
    })
  }

  // plays oscillators at indeces in osillatorArray
  // corresponding to indeces in current step sequence data where digit is 1
  step() {
    var stepDads = this.sequenceData.substr(this.currentStep * this.vcoCount, this.vcoCount)
    var indeces = this.getIndeces(stepDads)
    indeces.forEach(index => {
      this.oscillators[index].trigger();
    });

    highlightRow(this.currentStep, indeces)

    if(this.currentStep < 15) {
      this.currentStep += 1;
    } else {
      this.currentStep = 0;
    }

  }

  getIndeces(stepDads){
    let indeces = [];
    for(let i = 0; i < stepDads.length; i++){
      if(stepDads[i] === "1"){ indeces.push(i)}
    }
    return indeces;
  }

  startSequencer() {
    // starts interval
    // saves intervalID as instance variable
    // interval triggers step method, every speed milliseconds
    this.intervalId = setInterval(function(scope){ scope.step()}, 200, this)
  }

  stopSequencer() {
    clearInterval(this.intervalId);
  }

}

var sequencer = new Sequencer(16, 'c_major',"0000000000000001000000000000000000000000000010000000000000010000000000000010000000000000010000000000000010000000000000000000000100000010010000000000010000000000000010000000000000010000000000000000000000000000000010000000000010000000000000000000001000000001" );

function toggleMarked(element){

  if(element.hasClass("marked")){
    element.removeClass("marked")
  } else {
    element.addClass("marked")
  }
}

function generateGrid(){
  for(var i = 0; i < sequencer.vcoCount; i++){
    $("#grid").append(`<div class="row" id="row-${i}"></div>`)
    for(var n = 0; n < sequencer.vcoCount; n++){
      $(`#row-${i}`).append(`<div class="square" id="square-${(i*16)+n}"></div>`)

      $(`#square-${(i*16)+n}`).click(function(){
        var id = $(this).attr("id").match(/[0-9]+/)[0];
        sequencer.toggle(id);
        toggleMarked($(this));
      })
    }
  }
  placeMarkers();
}

function placeMarkers(){
  for(var i = 0; i < 16; i++){
    var rowData = sequencer.sequenceData.substr(i*16, 16);
    for(var n = 0; n < 16; n++){
      $(`#row-${i} #square-${(i*16)+n}`).removeClass("marked")
      if(rowData.charAt(n) === "1"){
        $(`#row-${i} #square-${(i*16)+n}`).addClass("marked")
      }
    }
  }
}

function highlightRow(rowId, indeces){
  var prev;
  if(rowId === 0){
    prev = 15;
  } else {
    prev = rowId - 1;
  }
  for(var i = 0; i < 16; i++){
    $(`#row-${prev} #square-${(prev*16)+i}`).removeClass("active pressed");
    $(`#row-${rowId} #square-${(rowId*16)+i}`).addClass("active");
  }
  indeces.forEach(index => {
    $(`#row-${rowId} #square-${(rowId*16)+index}`).addClass("pressed")
  });
}

function getPattern(id){
  $.get(`http://localhost:3000/sequences/${id}`).done(sequence => {
    sequencer.sequenceTitle = sequence.title;
    sequencer.sequenceData = sequence.data;
    sequencer.sequenceId = sequence.id;
    placeMarkers();
  });
}

// ----------------------------------------- UI
$(document).ready(function(){

  // request all sequences form API
  $.get("http://localhost:3000/sequences").done(sequences => {
    sequences.forEach(sequence => {
      $('#patterns').append(
        `<button class="pattern-button" data-id="${sequence.id}" >${sequence.title}</button>`
      );
      // set sequence data onclick
    });
    $('.pattern-button').click(function() {
      sequencer.sequenceData = $(this).attr('data-pattern');
      console.log('dang');
    });
    $('.pattern-button').click(function(){
      var id = $(this).attr('data-id');
      getPattern(id);


    });
  });

  generateGrid();


  sequencer.oscillators.forEach((osc, index) => {
      $(".triggers").append(`<button class="button" id="${index}">${index+1}</button>`);
  });

  $(".button").click(function(){
    var index = parseInt($(this).attr('id'), 10);
    sequencer.oscillators[index].trigger();

  });

  // master volume
  document.getElementById('master-volume').addEventListener('input', function() {
    sequencer.masterVolume.gain.value = this.value;
    $('#current-master-volume').text(this.value);
  });

  // filter
  document.getElementById('filter').addEventListener('input', function() {
    sequencer.filter.frequency.value = this.value;
    $('#current-filter-cutoff').text(this.value);
  });

  // filter resonance
  document.getElementById('reso').addEventListener('input', function() {
    sequencer.filter.Q.value = this.value;
    $('#current-filter-reso').text(this.value);
  });

  // release
  document.getElementById('release').addEventListener('input', function() {
    release = this.value;
    $('#current-release').text(this.value);
  });

  $('#start-sequencer').click(function(){
    sequencer.startSequencer()
  });

  $('#stop-sequencer').click(function(){
    sequencer.stopSequencer()
  });
});
