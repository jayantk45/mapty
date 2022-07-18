'use strict';

class Workout{

	date = new Date();
	id = (Date.now() + "").slice(-10);
	clicks = 0;


	constructor(coords, distance, duration){
		this.coords = coords;	// array of latitude and longitude
		this.distance = distance;	// in km
		this.duration = duration;	// in min
	}

	_setDescription(){
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
	}

	click(){
		this.clicks++;
	}
}

class Running extends Workout {
	type = "running";

	constructor(coords, distance, duration, cadence){
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();

	}

	calcPace(){
		// min/km
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = "cycling";

	constructor(coords, distance, duration, elevationGain){
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		// this.type = "cycling"
		this.calcSpeed();
		this._setDescription();

	}

	calcSpeed(){
		// km/ hour
		this.speed = this.distance / (this.duration / 60)
		return this.speed
	}
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//--------------------------------------------------------------------------------------------

//refractoring the project architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {

	//creating private class fields
	#map;
	#mapZoomLevel = 13;
	#mapEvent;
	#workouts = [];

	constructor() {

		// Get users positions
		this._getPosition();

		//Get data from loacal storage
		this._getLocalStorage();

		// Event listener for new workout
		form.addEventListener('submit', this._newWorkout.bind(this));
		
		// Event listener for changing CADENCE to ELEVATION while cycling
		inputType.addEventListener('change', this._toggleElevationField);

		//Event listener forMove to marker on click
		containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
	}

	_getPosition() {
		//displaying the map using the leaflet library
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
				alert('Could not get your position');
			});
		}
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

		const coords = [ latitude, longitude ]; //array

		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.#map);

		//handling clicks on the map
		this.#map.on('click', this._showForm.bind(this));


		this.#workouts.forEach(work => {
			this._renderWorkoutMarker(work);
		})
	}

	_showForm(mapE) {
		//DISPLAYING  THE WORKOUT FORM
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	_hideForm() {
		//clearing the form input field value, after submitting the form
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
		
		form.style.display = "none";
		form.classList.add('hidden');
		setTimeout(() => (form.style.display = "grid"), 1000);

	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); //closest method selects parents
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	_newWorkout(e) {

		const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

		const allPositive = (...inputs) => inputs.every(inp => inp > 0);

		e.preventDefault(); //to prevent auto form submiting and avoiding page reload

			// Get data from the form
			const type = inputType.value;
			const distance = +inputDistance.value;
			const duration = +inputDuration.value;
			const { lat, lng } = this.#mapEvent.latlng;

			let workout;

			// If the workout is running, then create running object
			if(type === "running"){
				const cadence = +inputCadence.value;

				// Check if the data in the form is valid
				if(
					// !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)
					!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
				){
					return alert("Inputs have to be a positive number!");
				}

				workout = new Running([lat, lng], distance, duration, cadence);
			}

			// If the workout is cycling, then create cycling object
			if(type === "cycling"){
				const elevation = +inputElevation.value;

				// Check if the data in the form is valid
				if(
					!validInputs(distance, duration, elevation) || !allPositive(distance, duration)
				){
					return alert("Inputs have to be a positive number!");
				}

				workout = new Cycling([lat, lng], distance, duration, elevation);

			}

			// Add new object to workout array
			this.#workouts.push(workout);

			// Render workout on map as marker
			this._renderWorkoutMarker(workout)
			

			// Render workout on list
			this._renderWorkout(workout)

			// Hide the form and clear the input fields
			this._hideForm();
			
			// Set local storage to all workouts
			this._setLocalStorage()
			
	}

	_renderWorkoutMarker(workout){
		//displaying the map marker wherever we point with the submit event listener
		L.marker(workout.coords)
		.addTo(this.#map)
		.bindPopup(
			L.popup({
				maxWidth: 250,
				minWidth: 100,
				autoClose: false,
				closeOnClick: false,
				className: `${workout.type}-popup`
			})
		)
		.setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
		.openPopup();
	}

	_renderWorkout(workout){
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
			<h2 class="workout__title">${workout.description}</h2>
			<div class="workout__details">
		  		<span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
		  		<span class="workout__value">${workout.distance}</span>
		  		<span class="workout__unit">km</span>
			</div>
			<div class="workout__details">
		  		<span class="workout__icon">⏱</span>
		  		<span class="workout__value">${workout.duration}</span>
		 		<span class="workout__unit">min</span>
			</div>
		`;

		if(workout.type === "running"){
			html += `
				<div class="workout__details">
            		<span class="workout__icon">⚡️</span>
            		<span class="workout__value">${workout.pace.toFixed(1)}</span>
            		<span class="workout__unit">min/km</span>
          		</div>
          		<div class="workout__details">
            		<span class="workout__icon">🦶🏼</span>
            		<span class="workout__value">${workout.cadence}</span>
            		<span class="workout__unit">spm</span>
          		</div>
        	</li>
			`;
		}


		if(workout.type === "cycling"){
			html += `
				<div class="workout__details">
            		<span class="workout__icon">⚡️</span>
            		<span class="workout__value">${workout.speed.toFixed(1)}</span>	
            		<span class="workout__unit">km/h</span>
          		</div>
         		<div class="workout__details">
            		<span class="workout__icon">⛰</span>
            		<span class="workout__value">${workout.elevationGain}</span>
            		<span class="workout__unit">m</span>
         		</div>
        	</li>
			`;
		}

		form.insertAdjacentHTML("afterend", html);
	}

	//Move to marker on click
	_moveToPopup(e){
		const workoutEl = e.target .closest(".workout");
		console.log(workoutEl);

		if(!workoutEl){
			return;
		}

		const workout = this.#workouts.find(
			work => work.id === workoutEl.dataset.id
		);
		
		//moving the map to the particular marker
		//for tis we use a method predefined in leaflet i.e "setView"
		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});

		//using the public interface
		// workout.click();
	}

	_setLocalStorage() {
		localStorage.setItem("workouts", JSON.stringify(this.#workouts));
	}

	_getLocalStorage(){
		const data = JSON.parse(localStorage.getItem("workouts"));

		if(!data) return;

		this.#workouts = data;

		this.#workouts.forEach(work => {
			this._renderWorkout(work);
		})
	}

	// To remove workouts in the local storage from the browser console
	reset(){
		localStorage.removeItem("workouts");
		location.reload();
	}
}

const app = new App();


