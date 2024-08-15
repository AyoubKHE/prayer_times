
function onPrayerTimeApiResponse(prayerTimeApiResponse, date) {
    prayerTimeApiResponse = prayerTimeApiResponse.data.data;

    let daysInFrench = new Map();
    daysInFrench.set("Saturday", "Samedi");
    daysInFrench.set("Sunday", "Dimanche");
    daysInFrench.set("Monday", "Lundi");
    daysInFrench.set("Tuesday", "Mardi");
    daysInFrench.set("Wednesday", "Mercredi");
    daysInFrench.set("Thursday", "Jeudi");
    daysInFrench.set("Friday", "Vendredi");

    let dayName = prayerTimeApiResponse.date.gregorian.weekday.en;
    let prayerTimings = prayerTimeApiResponse.timings;

    document.querySelector(".date").textContent = `${daysInFrench.get(dayName)} - ${date.day} ${date.month} ${date.year}`;

    let TimesSpans = document.querySelectorAll(".prayer-time");
    for (const timeSpan of TimesSpans) {
        timeSpan.textContent = prayerTimings[timeSpan.id];
    }
    document.getElementById("spinner").style.display = "none";
}


async function findByPlaceCoordinates(latitude, longitude, date) {

    function getRealPlaceName(placeReverseApiResponse) {
        if (
            typeof placeReverseApiResponse.data !== "string" &&
            Object.keys(placeReverseApiResponse.data).length !== 0 &&
            !placeReverseApiResponse.data.hasOwnProperty("error")
        ) {

            let displayName = placeReverseApiResponse.data.display_name.split(",");
            let realPlaceName = displayName[0];
            let countryName = "";
            if (displayName.length > 1) {
                countryName = ", " + displayName[displayName.length - 1];
            }

            return {
                "realPlaceName": realPlaceName,
                "countryName": countryName
            }
        }
        else {
            throw new Error("Y' a pas d'information sur les temps de prière dans cet endroit");
        }
    }

    try {
        let placeReverseApiResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
                lat: Number.parseFloat(latitude),
                lon: Number.parseFloat(longitude),
                format: "json"
            }
        })

        let { realPlaceName, countryName } = getRealPlaceName(placeReverseApiResponse);

        let prayerTimeApiResponse = await axios.get(`https://api.aladhan.com/v1/timings/${date.day}-${date.month}-${date.year}`, {
            params: {
                latitude: latitude,
                longitude: longitude,
                method: 3
            }
        });

        onPrayerTimeApiResponse(prayerTimeApiResponse, date);

        document.querySelector(".place-name").textContent = `${realPlaceName}${countryName}`;

    } catch (error) {
        document.getElementById("spinner").style.display = "none";
        setTimeout(() => {
            alert(error.message);
        }, 50);
    }

}


(async function getPrayerTimesByCurrentLocation() {

    function requestUserLocation() {

        return new Promise((resolve, reject) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve(position);
                    },
                    (error) => {
                        reject(error);
                    }
                );
            }
            else {
                let error = new Error("La géolocalisation n'est pas prise en charge par ce navigateur.");
                reject(error);
            }
        })

    }

    try {

        let position = await requestUserLocation();

        let currentDate = new Date();

        let date = {
            day: currentDate.getDate() < 10 ? "0" + currentDate.getDate() : currentDate.getDate(),
            month: (currentDate.getMonth() + 1) < 10 ? "0" + (currentDate.getMonth() + 1) : currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        }

        findByPlaceCoordinates(position.coords.latitude, position.coords.longitude, date);
    } catch (error) {
        document.getElementById("place-name").textContent = "Chercher un endroit !";
        console.log(error);
    }

})();

(function addBlurEventToInptPlace() {

    let inptPlace = document.getElementById("input-place");

    inptPlace.addEventListener("blur", function () {

        function isStringContainsOnlyLetters(input) {
            let regex = /^[a-zA-Zé\s,]+$/;
            return regex.test(input);
        }

        let epPlaceName = document.getElementById("ep-place-name");

        let epPlaceNameText = document.getElementById("ep-place-name-text");

        if (this.value === "") {
            epPlaceName.style.display = "inline";
            epPlaceNameText.textContent = "Champ obligatoire !";
            epPlaceNameText.style.width = "160px";
            this.style.width = "90%";
        }
        else if (!isStringContainsOnlyLetters(this.value)) {
            epPlaceName.style.display = "inline";
            epPlaceNameText.textContent = "Saisissez un endroit valide : seules les lettres latines sont autorisées";
            epPlaceNameText.style.width = "230px";
            this.style.width = "90%";
        }
        else {
            epPlaceName.style.display = "none";
            epPlaceName.title = "";
            this.style.width = "100%";

            this.value = this.value.substring(0, 1).toUpperCase() + this.value.substring(1).toLowerCase();
        }
    })
})();

(function adjustDate() {

    let inptDate = document.getElementById("input-date");
    let currentDay = new Date().toISOString().split('T')[0];

    inptDate.value = currentDay;
})();


let btnFindBy = document.getElementById("btn-find-by");

let liFindByPlaceName = document.getElementById("li-find-by-place-name");

liFindByPlaceName.addEventListener("click", function () {

    if (btnFindBy.innerText.trim() !== "Nom de l'endroit") {

        btnFindBy.textContent = "Nom de l'endroit";
        let divInputs = document.querySelector(".inputs");
        divInputs.setAttribute("class", "col-12 col-md-3 inputs");

        divInputs.innerHTML = `
            <input type="text" class="input-place" id="input-place" placeholder="Nom de l'endroit">

            <div class="my-tooltip" id="ep-place-name">
                <div class="icon">!</div>
                <div class="my-tooltiptext" id="ep-place-name-text"></div>
            </div>
        `
        addBlurEventToInptPlace();

    }
})

let liFindBycoordinates = document.getElementById("li-find-by-place-coordinates");
liFindBycoordinates.addEventListener("click", function () {

    if (btnFindBy.innerText.trim() !== "coordonnées géographiques") {

        function addBlurEventToInptCoordinates() {

            function addBlurEventToLatitude() {

                // Valid Latitude is between -90 and +90
                function isValidLatitude(input) {
                    let regex = /^-?([0-9]|[1-8][0-9])(\.\d+)?$/;
                    return regex.test(input);
                }

                let inptLatitude = document.getElementById("inpt-latitude");

                inptLatitude.addEventListener("blur", function () {

                    let epLatitude = document.getElementById("ep-latitude");

                    let epLatitudeText = document.getElementById("ep-latitude-text");

                    if (this.value === "") {
                        epLatitude.style.display = "inline";
                        epLatitudeText.textContent = "Champ obligatoire !";
                        epLatitudeText.style.width = "160px";
                        this.style.width = "60%";
                    }
                    else if (!isValidLatitude(this.value)) {
                        epLatitude.style.display = "inline";
                        epLatitudeText.textContent = "Saisissez une Latitude valide !";
                        epLatitudeText.style.width = "240px";
                        this.style.width = "60%";
                    }
                    else {
                        epLatitude.style.display = "none";
                        epLatitude.title = "";
                        this.style.width = "68%";
                    }
                })
            }

            function addBlurEventToLongitude() {

                // Valid Longitude is between -180 and +180
                function isValidLongitude(input) {
                    let regex = /^-?([0-9]|[1-9][0-9]|1([0-7][0-9]))(\.\d+)?$/;
                    return regex.test(input);
                }

                let inptLongitude = document.getElementById("inpt-longitude");

                inptLongitude.addEventListener("blur", function () {

                    let epLongitude = document.getElementById("ep-longitude");

                    let epLongitudeText = document.getElementById("ep-longitude-text");

                    if (this.value === "") {
                        epLongitude.style.display = "inline";
                        epLongitudeText.textContent = "Champ obligatoire !";
                        epLongitudeText.style.width = "160px";
                        this.style.width = "60%";
                    }
                    else if (!isValidLongitude(this.value)) {
                        epLongitude.style.display = "inline";
                        epLongitudeText.textContent = "Saisissez une Longitude valide !";
                        epLongitudeText.style.width = "250px";
                        this.style.width = "60%";
                    }
                    else {
                        epLongitude.style.display = "none";
                        epLongitude.title = "";
                        this.style.width = "68%";
                    }
                })
            }

            addBlurEventToLatitude();

            addBlurEventToLongitude();

        }


        btnFindBy.textContent = "coordonnées géographiques";
        let divInputs = document.querySelector(".inputs");
        divInputs.setAttribute("class", "col-12 col-md-5 inputs");

        divInputs.innerHTML = `
            <div class="row" style="height: 100%;">

                <div class="col-12 col-sm-6" style="padding-right: 0;">
                    <label for="">Latitude:</label>

                    <input type="text" class="input-coordinates" id="inpt-latitude">

                    <div class="my-tooltip" id="ep-latitude">
                        <div class="icon">!</div>
                        <div class="my-tooltiptext" id="ep-latitude-text"></div>
                    </div>
                </div>

                <div class="col-12 col-sm-6" style="padding-left: 0;">
                    <label for="">Longitude:</label>

                    <input type="text" class="input-coordinates" id="inpt-longitude">

                    <div class="my-tooltip" id="ep-longitude">
                        <div class="icon">!</div>
                        <div class="my-tooltiptext" id="ep-longitude-text"></div>
                    </div>
                </div>
            </div>
        `
        addBlurEventToInptCoordinates();

    }
})


let btnSearch = document.getElementById("btn-search");

let placeName = document.getElementById("input-place").value;

let inputDate = document.getElementById("input-date").value.split("-");
let date = {
    day: inputDate[2],
    month: inputDate[1],
    year: inputDate[0]
}


async function findByPlaceName(placeName) {

    function getPlaceInformations(placeApiResponse) {
        if (typeof placeApiResponse.data !== "string" && Object.keys(placeApiResponse.data).length !== 0) {

            let latitude = placeApiResponse.data[0].lat;
            let longitude = placeApiResponse.data[0].lon;

            let displayName = placeApiResponse.data[0].display_name.split(",");
            let realPlaceName = displayName[0];
            let countryName = "";
            if (displayName.length > 1) {
                countryName = ", " + displayName[displayName.length - 1];
            }

            return {
                "latitude": latitude,
                "longitude": longitude,
                "realPlaceName": realPlaceName,
                "countryName": countryName
            }

        }
        else {

            throw new Error("L'endroit n'est pas trouvé, pourriez vous ajouter plus de détails sur l'endroit");

        }
    }

    try {
        let placeApiResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: placeName,
                format: "json"
            }
        });

        let { latitude, longitude, realPlaceName, countryName } = getPlaceInformations(placeApiResponse);

        let prayerTimeApiResponse = await axios.get(`https://api.aladhan.com/v1/timings/${date.day}-${date.month}-${date.year}`, {
            params: {
                latitude: latitude,
                longitude: longitude,
                method: 3
            }
        });

        onPrayerTimeApiResponse(prayerTimeApiResponse, date);

        document.querySelector(".place-name").textContent = `${realPlaceName}${countryName}`;

    } catch (error) {
        document.getElementById("spinner").style.display = "none";
        setTimeout(() => {
            alert(error.message);
        }, 50);
    }

}


btnSearch.addEventListener("click", function () {

    if (btnFindBy.innerText.trim() === "Nom de l'endroit") {

        let epPlaceName = document.getElementById("ep-place-name");
        placeName = document.getElementById("input-place").value;

        if (epPlaceName.style.display !== "inline" && placeName !== "") {
            document.getElementById("spinner").style.display = "block";
            findByPlaceName(placeName);
        }
        else {
            alert("Saisissez un endroit valides");
        }
    }
    else {

        let latitude = document.getElementById("inpt-latitude").value;
        let longitude = document.getElementById("inpt-longitude").value;

        let epLatitude = document.getElementById("ep-latitude");
        let epLongitude = document.getElementById("ep-longitude");

        if (epLatitude.style.display !== "inline" && epLongitude.style.display !== "inline" && latitude !== "" && longitude !== "") {
            document.getElementById("spinner").style.display = "block";

            let inputDate = document.getElementById("input-date").value.split("-");
            let date = {
                day: inputDate[2],
                month: inputDate[1],
                year: inputDate[0]
            }

            findByPlaceCoordinates(latitude, longitude, date);
        }
        else {
            alert("Saisissez des coordonnées valides");
        }
    }
})



document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        document.getElementById("btn-search").click();
    }
})

