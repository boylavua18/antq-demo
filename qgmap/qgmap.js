// main var
var map;
var markers = [];
var qtWidget;

new QWebChannel(qt.webChannelTransport, function (channel) {
    qtWidget = channel.objects.qtWidget;
});

// main init function
function initialize() {
    var myOptions = {
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    var div = document.getElementById("map_canvas");
    map = new google.maps.Map(div, myOptions);

    google.maps.event.addListener(map, 'dragend', function () {
        center = gmap_getCenter();
        qtWidget.mapMoved(center.lat(), center.lng());
    });
    google.maps.event.addListener(map, 'click', function (ev) {
        qtWidget.mapClicked(ev.latLng.lat(), ev.latLng.lng());
    });
    google.maps.event.addListener(map, 'rightclick', function (ev) {
        qtWidget.mapRightClicked(ev.latLng.lat(), ev.latLng.lng());
    });
    google.maps.event.addListener(map, 'dblclick', function (ev) {
        qtWidget.mapDoubleClicked(ev.latLng.lat(), ev.latLng.lng());
    });
}

// custom functions
function gmap_setCenter(lat, lng) {
    map.setCenter(new google.maps.LatLng(lat, lng));
}

function gmap_getCenter() {
    return map.getCenter();
}

function gmap_setZoom(zoom) {
    map.setZoom(zoom);
}

function gmap_addMarker(key, latitude, longitude, parameters) {

    if (key in markers) {
        gmap_deleteMarker(key);
    }

    var coords = new google.maps.LatLng(latitude, longitude);
    parameters['map'] = map
    parameters['position'] = coords;
    parameters['label'] = key;

    var marker = new google.maps.Marker(parameters);
    google.maps.event.addListener(marker, 'dragend', function () {
        qtWidget.markerMoved(key, marker.position.lat(), marker.position.lng())
    });
    google.maps.event.addListener(marker, 'click', function () {
        qtWidget.markerClicked(key, marker.position.lat(), marker.position.lng())
    });
    google.maps.event.addListener(marker, 'dblclick', function () {
        qtWidget.markerDoubleClicked(key, marker.position.lat(), marker.position.lng())
    });
    google.maps.event.addListener(marker, 'rightclick', function () {
        qtWidget.markerRightClicked(key, marker.position.lat(), marker.position.lng())
    });

    markers[key] = marker;
    return key;
}

function calculateAndDisplayRoute(oLat, oLong, dLat, dLong) {
    var orgi = new google.maps.LatLng(oLat, oLong);
    var di = new google.maps.LatLng(dLat, dLong);
    var directionsService = new google.maps.DirectionsService;
    var directionsDisplay = new google.maps.DirectionsRenderer;
    directionsDisplay.setMap(map);
    directionsDisplay.setOptions({suppressMarkers: true});
    directionsService.route({
        origin: orgi,
        destination: di,
        travelMode: 'DRIVING'
    }, function (response, status) {
        if (status === 'OK') {
            directionsDisplay.setDirections(response);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function displayAllRout(listCoords) {
    var directionsService = new google.maps.DirectionsService;
    for(var i = 0; i < listCoords.length-1; i++) {
        var currentCoord = new google.maps.LatLng(listCoords[i].latitude, listCoords[i].longitude);
        var nextCoord = new google.maps.LatLng(listCoords[i+1].latitude, listCoords[i+1].longitude);
        directionsService.route({
            origin: currentCoord,
            destination: nextCoord,
            travelMode: 'DRIVING'
        }, function (response, status) {
            if (status === 'OK') {
                var directionsDisplay = new google.maps.DirectionsRenderer;
                directionsDisplay.setMap(map);
                directionsDisplay.setOptions({suppressMarkers: true});
                directionsDisplay.setDirections(response);
            } else {
            window.alert('Directions request failed due to ' + status);
            }
        });
        await sleep(200);
    }
}

function displayAllRouteVer2(listCoords, bestTour) {
    var directionsService = new google.maps.DirectionsService;
    var waypts = [];
    for(var i = 1; i < listCoords.length; i++) {
        if(i%10==9) {
            var start = new google.maps.LatLng(listCoords[bestTour[i-9]].latitude, listCoords[bestTour[i-9]].longitude);
            var end = new google.maps.LatLng(listCoords[bestTour[i]].latitude, listCoords[bestTour[i]].longitude);
            directionsService.route({
                origin: start,
                destination: end,
                waypoints: waypts,
                optimizeWaypoints: true,
                travelMode: 'DRIVING'
            }, function(response, status) {
                if (status === 'OK') {
                    var directionsDisplay = new google.maps.DirectionsRenderer;
                    directionsDisplay.setMap(map);
                    directionsDisplay.setOptions({suppressMarkers: true});
                    directionsDisplay.setDirections(response);
                } else {
                    window.alert('Directions request failed due to ' + status);
                }
            });
            waypts = [];
        } else if(i==listCoords.length-1) {
            var sub = i%10;
            var start = new google.maps.LatLng(listCoords[bestTour[i-sub]].latitude, listCoords[i-sub].longitude);
            var end = new google.maps.LatLng(listCoords[bestTour[i]].latitude, listCoords[i].longitude);
            directionsService.route({
                origin: start,
                destination: end,
                waypoints: waypts,
                optimizeWaypoints: false,
                travelMode: 'DRIVING'
            }, function(response, status) {
                if (status === 'OK') {
                    var directionsDisplay = new google.maps.DirectionsRenderer;
                    directionsDisplay.setMap(map);
                    directionsDisplay.setOptions({suppressMarkers: true});
                    directionsDisplay.setDirections(response);
                } else {
                    window.alert('Directions request failed due to ' + status);
                }
            });
        } else if(i%10!=0) {
            var cur = new google.maps.LatLng(listCoords[bestTour[i]].latitude, listCoords[bestTour[i]].longitude);
            waypts.push({
              location: cur,
              stopover: true
            });
            alert(listCoords[bestTour[i]].latitude);
        }
    }
}

function gmap_moveMarker(key, latitude, longitude) {
    var coords = new google.maps.LatLng(latitude, longitude);
    markers[key].setPosition(coords);
}

function gmap_deleteMarker(key) {
    markers[key].setMap(null);
    delete markers[key]
}

function gmap_changeMarker(key, extras) {
    if (!(key in markers)) {
        return
    }
    markers[key].setOptions(extras);
}

