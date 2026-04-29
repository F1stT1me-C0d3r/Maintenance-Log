document.addEventListener('DOMContentLoaded', () => {
  const filterButton = document.getElementById('filterButton');
  const clearButton = document.getElementById('clearButton');
  const resultsList = document.getElementById('resultsList');
  const modal = document.createElement('dialog');

        modal.id = 'updateModal';
        modal.innerHTML = `
        <form id="updateForm" method="dialog" class="modal-content">
            <h3 id="modalTitle"></h3>
            <div id="maintenanceItems">
                <div class="maintenance-row">
                    <label>Maintenance item:</label>
                    <input type="text" id="maintenanceType" name="maintenanceType" list="maintenanceOptions" placeholder="Select or type a maintenance item" required />
                    <datalist id="maintenanceOptions">
                        <option value="Air Filter Change">
                        <option value="Battery Replacement">
                        <option value="Belt Replacement">
                        <option value="Brake Pad Replacement">
                        <option value="Bulb Replacement">
                        <option value="Engine Coolant Flush">
                        <option value="Fuel Filter Change">
                        <option value="Hose Replacement">
                        <option value="Oil & Filter Change">
                        <option value="Tire Alignment">
                        <option value="Tire Repair / Replacement">
                        <option value="Tire Rotation / Balance">
                        <option value="Transmission Fluid Change">
                        <option value="Windshield Wiper Replacement">
                    </datalist>
                    <label>Cost ($):</label>
                    <input type="number" id="maintenanceCost" name="maintenanceCost" class="cost-input" placeholder="0.00" min="0" step="0.01" required />
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button type="button" id="addItemBtn">+ Add Another Item</button>
                <div class="modal-total">
                    <label>Total Cost:</label>
                    <span id="totalCost">$0.00</span>
                </div>
            </div>
            <div class="modal-buttons">
                <button type="submit">Submit</button>
                <button type="button" id="cancelModalBtn">Cancel</button>
            </div>
        </form>`;
        document.body.appendChild(modal);

        if (typeof modal.showModal !== 'function') {
          console.error('HTMLDialogElement not supported in this browser.');
        }

        const cancelBtn = modal.querySelector('#cancelModalBtn');
        if (!cancelBtn) {
          console.error('Modal failed to render: #cancelModalBtn not found');
        } else {
          cancelBtn.addEventListener('click', () => modal.close());
        }

        const updateTotal = () => {
          const total = Array.from(modal.querySelectorAll('.cost-input'))
            .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
          const totalEl = modal.querySelector('#totalCost');
          if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
        };

        modal.querySelector('#updateForm').addEventListener('input', updateTotal);

        const notification = document.createElement('div');
        notification.textContent = 'Maintenance list updated';
        notification.className = 'maintenance-notification';
        notification.style.cssText = 'display:none; position:fixed; bottom:24px; right:24px; background:#2e7d32; color:#fff; padding:10px 18px; border-radius:6px; font-weight:500; z-index:9999;';
        document.body.appendChild(notification);

        modal.querySelector('#updateForm').addEventListener('submit', () => {
          const items = Array.from(modal.querySelectorAll('.maintenance-row')).map(row => ({
            type: (row.querySelector('input[type="text"]') || {}).value || '',
            cost: parseFloat((row.querySelector('.cost-input') || {}).value) || 0
          })).filter(item => item.type);

          const entry = {
            make: modal.dataset.entryMake,
            model: modal.dataset.entryModel,
            year: modal.dataset.entryYear,
            plate: modal.dataset.entryPlate,
            imageUrl: modal.dataset.entryImage,
            items,
            total: (modal.querySelector('#totalCost') || {}).textContent || '$0.00',
            date: new Date().toLocaleDateString()
          };

          const log = JSON.parse(localStorage.getItem('maintenanceLog') || '[]');
          log.unshift(entry);
          localStorage.setItem('maintenanceLog', JSON.stringify(log));

          notification.style.display = 'block';
          setTimeout(() => { notification.style.display = 'none'; }, 3000);
        });

        const addItemBtn = modal.querySelector('#addItemBtn');
        if (!addItemBtn) {
          console.error('Modal failed to render: #addItemBtn not found');
        } else {
          addItemBtn.addEventListener('click', () => {
            const items = modal.querySelector('#maintenanceItems');
            const firstRow = items.querySelector('.maintenance-row');
            const newRow = firstRow.cloneNode(true);
            newRow.querySelectorAll('input').forEach(input => {
              input.value = '';
              input.removeAttribute('id');
              input.removeAttribute('required');
            });
            const clonedDatalist = newRow.querySelector('datalist');
            if (clonedDatalist) clonedDatalist.remove();
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '✕';
            removeBtn.className = 'remove-item-btn';
            removeBtn.addEventListener('click', () => { newRow.remove(); updateTotal(); });
            newRow.appendChild(removeBtn);
            items.appendChild(newRow);
          });
        }

  

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
                         <button class="update-button" data-make="${makeEntry.make}" data-model="${model.name}" data-year="${model.year}" data-plate="${model.plate}" data-image="${model.imageUrl}">Update</button>
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
            resultsList.innerHTML = '<p class="error">Please enter a make, model, year, or plate # to filter.</p>';
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

    resultsList.addEventListener('click', (e) => {
        if (!e.target.classList.contains('update-button')) return;
        const { make, model, year, plate, image } = e.target.dataset;
        document.getElementById('modalTitle').textContent =
            `${make} ${model} (${year}) — Plate # ${plate}`;
        document.getElementById('maintenanceType').value = '';
        document.getElementById('maintenanceCost').value = '';
        modal.dataset.entryMake = make;
        modal.dataset.entryModel = model;
        modal.dataset.entryYear = year;
        modal.dataset.entryPlate = plate;
        modal.dataset.entryImage = image;
        Array.from(modal.querySelector('#maintenanceItems').querySelectorAll('.maintenance-row')).slice(1).forEach(row => row.remove());
        const totalEl = modal.querySelector('#totalCost');
        if (totalEl) totalEl.textContent = '$0.00';
        try {
          modal.showModal();
        } catch (err) {
          console.error('Failed to open modal:', err);
        }
    });

   
});