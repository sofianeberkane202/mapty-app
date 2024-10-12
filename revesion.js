import { Running, Cycling, workouts } from './wokouts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// Manually setting the default icon paths
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevationGain = document.querySelector('.form__input--elevation');
const WorkoutsContainer = document.querySelector('.workouts');

// if (module.hot) {
//   module.hot.accept();
// }

class App {
  #map;
  #eventPos;
  #workoutsArr = [];
  constructor() {
    this.#getPosition();

    this.#getLocalStorage();

    form.addEventListener('click', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#switch);
    WorkoutsContainer.addEventListener('click', this.#move.bind(this));
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('please activate your location!!!');
        }
      );
    }
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer(
      'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7lxSnKNFFKQiMsgjqEuO',
      {
        attribution:
          '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      }
    ).addTo(this.#map);

    // Add a marker

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(this.#generatePopup('My Location'))
      .openPopup(coords);

    // click on map
    this.#map.on('click', this.#renderForm.bind(this));
  }

  #renderForm(pos) {
    if (form.classList.contains('hidden')) {
      this.#eventPos = pos;
      // render workout form
      form.classList.remove('hidden');
      inputDistance.focus();
    }
  }

  #generatePopup = function (content, additionalOption = {}) {
    const options = {
      content: `<b>${content}</b>`,
      maxWidth: 250,
      minWidth: 150,
      autoClose: false,
      closeOnClick: false,
      ...additionalOption,
    };
    return L.popup(options);
  };

  #isValid(...info) {
    const valid = info.every(num => num && Number.isFinite(+num));
    const allPositves = info.map(num => +num).every(num => num > 0);
    return valid && allPositves;
  }

  #newWorkout(e) {
    e.preventDefault();
    const click = e.target.parentElement;
    if (click !== form) return;
    const type = inputType.value;
    const distance = inputDistance.value;
    const duration = inputDuration.value;
    const cadence = inputCadence.value;
    const elevationGain = inputElevationGain.value;
    const coords = [this.#eventPos.latlng.lat, this.#eventPos.latlng.lng];
    console.log(coords);
    let workout;
    if (
      !this.#isValid(
        distance,
        duration,
        type === 'running' ? cadence : elevationGain
      )
    ) {
      alert('All the inputs must be positive numbers');
      return;
    }

    if (type === 'running') {
      workout = new Running(duration, distance, type, cadence, coords);
    }
    if (type === 'cycling') {
      workout = new Cycling(duration, distance, type, elevationGain, coords);
    }
    workouts.get(type).push(workout.toObject());

    this.#renderWorkOutInList(workout);

    this.#renderWorkoutOnMap(type);
    // hide the form
    this.#init();
  }

  #renderWorkOutInList(workout) {
    console.log(workout);
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${this.#generateContent(
              workout.type
            )}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              } </span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🦶🏼' : '⛰'
              }</span>
              <span class="workout__value">${
                workout.type === 'running'
                  ? `${workout.cadence}`
                  : `${workout.elevationGain}`
              }</span>
              <span class="workout__unit">${
                workout.type === 'running' ? 'spm' : 'm'
              }</span>
            </div>
          </li>
    `;
    WorkoutsContainer.insertAdjacentHTML('beforeend', html);
    this.#setLocalStorage();
  }

  #renderWorkoutOnMap(type) {
    const { lat, lng } = this.#eventPos.latlng;
    const coords = [lat, lng];
    const content = this.#generateContent(type);
    const option = {
      className: `${type}-popup`,
    };
    const marker = L.marker(coords)
      .addTo(this.#map)
      .bindPopup(this.#generatePopup(content, option))
      .openPopup(coords);
  }

  #switch() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevationGain
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
  }

  #init() {
    inputType.value = 'running';
    inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    inputElevationGain.closest('.form__row').classList.add('form__row--hidden');
    form.classList.add('hidden');
    inputCadence.value =
      inputDistance.value =
      inputElevationGain.value =
      inputDuration.value =
        '';
  }

  #generateContent(type) {
    return `${type[0].toUpperCase() + type.slice(1)} on ${this.#now()}`;
  }

  #now() {
    return Intl.DateTimeFormat('en', {
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }

  #move(e) {
    e.preventDefault();
    const click = e.target.closest('.workout');
    if (!click) return;
    let arrWorkouts;
    if (click.classList.contains('workout--running'))
      arrWorkouts = workouts.get('running');
    if (click.classList.contains('workout--cycling'))
      arrWorkouts = workouts.get('cycling');

    const id = click.dataset.id;
    const findWorkout = arrWorkouts.find(workout => workout.id === id);
    this.#map.setView(findWorkout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #setLocalStorage() {
    const arr = Array.from(workouts.values()).filter(w => w.length > 0);
    localStorage.setItem('workout', JSON.stringify(arr));
  }
  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));
    if (!data) return;
    data.forEach(w => {
      this.#renderWorkOutInList(...w);
    });
  }
}

const app = new App();
