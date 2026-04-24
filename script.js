document.addEventListener('DOMContentLoaded', () => {
  const filterButton = document.getElementById('filterButton');
  const clearButton = document.getElementById('clearButton');
  const resultsList = document.getElementById('resultsList');
  

  let carData = { make: []};

  // Fetch the car data from the JSON file
  fetch('vehicles.json')
    .then(response => response.json())
    .then(data => {
      // data.make is an array with one object at index [0].
      // That object's keys are the make names (e.g. "Toyota", "Kia").
      // Object.entries() converts it into an array of [key, value] pairs:
      // e.g. [ ["Toyota", [...]], ["Kia", [...]], ... ]

      const make = Object.entries(data.make[0]).map(([makeName, [entry]]) => ({
        // makeName  — the make string pulled from the key, e.g. "Toyota"
        // [entry]   — destructures the single-item array each make holds,
        //             giving us the object with { id, models }
        make: makeName,

        // entry.models is an array of vehicle objects.
        // We map over it to keep only name and year, discarding color/(imageUrl-added back in).
        models: entry.models.map(m => ({ name: m.name, year: m.year, imageUrl: m.imageUrl, plate: m.plateNumber })),
      }));

      // Store the shaped array on carData.make so the rest of the app can use it.
      carData.make = make;
      displayVehicles();
      console.log('Car data loaded:', carData.make);
    })
    .catch(error => console.error('Error fetching vehicle data:', error));

    const displayVehicles = (data = carData.make) => {
        // inserted data parameter with default value of carData.make so we can call displayVehicles with filtered data without affecting the original dataset
        try {
            if (!data.length) {
                resultsList.innerHTML = '<li class="error">No vehicle data available.</li>';
                return;
            }

            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });

            resultsList.innerHTML = ''; // Clear previous results before displaying new ones
            data.forEach(makeEntry => {
                
                // replace carData.make.forEach with data.forEach to use the filtered data instead of the full dataset
                // render each model for the make, including the image and license plate
                // Each model is rendered as a list item with the image, make/model/year text, and an update button.
                makeEntry.models.forEach(model => {
                    resultsList.insertAdjacentHTML('beforeend', `
                    <li class="vehicle-item">
                        <img src="${model.imageUrl}" class="vehicle-image" />
                        <p>${makeEntry.make} ${model.name} (${model.year}) - License Plate # ${model.plate}</p>
                        <button class="update-button" id="updateBtn">Update</button>
                    </li>`);
                });
            });
        } catch (error) {
            console.error('Error displaying vehicles:', error);
            resultsList.innerHTML = '<li class="error">An error occurred while displaying vehicles.</li>';
        }
    };    

    filterButton.addEventListener('click', () => {
        try {
            const input = document.getElementById('maintenanceMessage').value.trim().toLowerCase();
            if (!input) {
            resultsList.innerHTML = '<p class="error">Please enter a make, model, or year to filter.</p>';
            return;
            }            
            const filteredMakes = carData.make.filter(makeEntry => {
                return makeEntry.make.toLowerCase() === input ||
                       makeEntry.models.some(model => model.name.toLowerCase() === input) ||
                       makeEntry.models.some(model => model.year.toString() === input) ||
                       makeEntry.models.some(model => model.plate.toLowerCase() === input);
            });
            displayVehicles(filteredMakes);            
        } catch (error) {
            console.error('Error processing input:', error);
            resultsList.innerHTML = '<p class="error">An error occurred while processing your request. Please try again.</p>';
            return;
         }
        
    });

    clearButton.addEventListener('click', () => {
        document.getElementById('maintenanceMessage').value = '';
        displayVehicles(); // Display all vehicles when clearing the filter
    });
    

        

});