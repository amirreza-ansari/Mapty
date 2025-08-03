'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = String(Date.now());

  constructor(distance, duration, coords) {
    this.coords = coords;
    this.duration = duration;
    this.distance = distance;
  }

  _createDescription() {
    this.description = `${this.type.slice(0, 1).toUpperCase()}${this.type.slice(
      1
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._createDescription();
  }

  calcPace() {
    this.pace = this.distance / (this.duration / 60);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._createDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////
// APPLICATION ARCHITECTURE

// Main Application calss
class App {
  #map;
  #mapEvent;
  #workouts = [];

  // Trigger onload
  constructor() {
    // Show the map as the page loades
    this._getPosition();

    // Form submit event
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Input type change event
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  // Get Position Method
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("user doesn't allow access to location");
        }
      );
    }
  }

  // Load Map Method
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('<b>Your location</b>')
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));

    this._getLocalStorage();
  }

  _showForm(mapE) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }

  _closeForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('div').classList.toggle('form__row--hidden');
    inputCadence.closest('div').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    this._closeForm();

    const validInputNumebrs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const validPositiveNumber = (...inputs) => inputs.every(input => input > 0);

    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    const { lat, lng } = this.#mapEvent.latlng;

    if (inputType.value === 'running') {
      const cadence = +inputCadence.value;

      // Catching Error
      if (
        !validInputNumebrs(cadence, duration, distance) ||
        !validPositiveNumber(cadence, duration, distance)
      ) {
        alert('Inputs have to be positive numbers!');
        this._clearInputs();
        return;
      }

      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    if (inputType.value === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !validInputNumebrs(elevationGain, duration, distance) ||
        !validPositiveNumber(duration, distance)
      ) {
        alert('Inputs have to be positive numbers!');
        this._clearInputs();
        return;
      }

      workout = new Cycling(distance, duration, [lat, lng], elevationGain);
    }

    this._clearInputs();

    this.#workouts.push(workout);

    // show marker
    this._renderWorkoutMarker(workout);

    // show workout
    this._renderWorkout(workout);

    this._setLocalStorage();
  }

  _clearInputs() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )

      .addTo(this.#map)
      .openPopup();
  }

  _renderWorkout(workout) {
    // prettier-ignore
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/hr</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">spm</span>
            </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');

    const workout = this.#workouts.find(
      work => work.id === workoutEl?.dataset.id
    );

    if (!workout) return;

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = localStorage.getItem('workouts');

    if (!data) return;

    this.#workouts = JSON.parse(data);

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
