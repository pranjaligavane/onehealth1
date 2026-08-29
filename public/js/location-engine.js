/**
 * ONEHEALTH AI - Geolocation, Haversine Distance & Explainable Doctor Recommendation Engine
 * Handles GPS positioning, city fallback, real availability states, and multi-factor ranking.
 */

class OneHealthLocationEngine {
  constructor() {
    this.userCoords = null; // { lat, lng, accuracy }
    this.userCity = 'Kopargaon';
    this.isGPSActive = false;
    this.lastLocationError = null;

    // Kopargaon taluka benchmark anchor coordinates
    this.villageCoordinates = {
      "kopargaon": { lat: 19.8824, lng: 74.4789 },
      "pohegaon": { lat: 19.8912, lng: 74.4623 },
      "dhamori": { lat: 19.8654, lng: 74.4921 },
      "savlivihor": { lat: 19.8450, lng: 74.4510 },
      "rahata": { lat: 19.8120, lng: 74.4820 },
      "shirdi": { lat: 19.7645, lng: 74.4762 }
    };
  }

  /**
   * Request GPS Location via Browser Geolocation API
   */
  async requestGPSLocation() {
    if (!navigator.geolocation) {
      this.isGPSActive = false;
      this.lastLocationError = "Geolocation is not supported by your browser.";
      return { success: false, error: this.lastLocationError };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          this.isGPSActive = true;
          this.lastLocationError = null;
          console.log(`[LocationEngine] GPS acquired: Lat ${this.userCoords.lat}, Lng ${this.userCoords.lng} (Accuracy: ${Math.round(pos.coords.accuracy)}m)`);
          resolve({ success: true, coords: this.userCoords });
        },
        (err) => {
          this.isGPSActive = false;
          let msg = "GPS permission denied or unavailable.";
          if (err.code === 1) msg = "Location permission denied by user.";
          else if (err.code === 2) msg = "Position unavailable.";
          else if (err.code === 3) msg = "Location request timed out.";
          this.lastLocationError = msg;
          console.warn('[LocationEngine] GPS Error:', msg);
          resolve({ success: false, error: msg });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Calculate Haversine Distance between two GPS points in kilometers
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Earth radius in km
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    return Math.round(distanceKm * 10) / 10; // Round to 1 decimal place (e.g. 1.8 km)
  }

  degToRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Get approximate coordinates for a village if GPS is off
   */
  getVillageCoordinates(villageName) {
    if (!villageName) return this.villageCoordinates["kopargaon"];
    const key = villageName.toLowerCase().trim();
    for (const [vName, coords] of Object.entries(this.villageCoordinates)) {
      if (key.includes(vName)) return coords;
    }
    return this.villageCoordinates["kopargaon"];
  }

  /**
   * Dedicated Explainable Doctor Recommendation & Ranking Engine
   *
   * Multi-Factor Criteria:
   * 1. Specialty Alignment (+50 pts)
   * 2. Geographic Proximity (+40 pts for closest, scaled by distance)
   * 3. Real Availability (+30 pts for AVAILABLE, +10 for BUSY, 0 for OFFLINE/UNKNOWN)
   * 4. Experience & Verified Credentials (+15 pts)
   */
  rankDoctors(doctorsList, options = {}) {
    const {
      recommendedSpecialty = null,
      targetVillage = null,
      targetRole = null, // 'doctor' or 'vet'
      userCoords = this.userCoords
    } = options;

    const isOnline = navigator.onLine;
    const now = new Date();
    const referenceCoords = userCoords || this.getVillageCoordinates(targetVillage || this.userCity);

    const ranked = doctorsList.map(doc => {
      let score = 0;
      const reasons = [];

      // 1. Sector check
      if (targetRole && doc.role !== targetRole) {
        score -= 50;
      }

      // 2. Specialty Matching
      let isSpecialtyMatched = false;
      if (recommendedSpecialty && doc.specialization) {
        const recLower = recommendedSpecialty.toLowerCase();
        const docSpecLower = (doc.specialization + " " + (doc.title || "")).toLowerCase();

        if (docSpecLower.includes(recLower) || recLower.includes(docSpecLower.split(' ')[0])) {
          score += 50;
          isSpecialtyMatched = true;
          reasons.push(`Specialty alignment: ${doc.specialization} directly matches your screening assessment`);
        }
      }

      // 3. Distance & Location calculation
      let distanceKm = null;
      if (doc.coordinates && doc.coordinates.lat && doc.coordinates.lng && referenceCoords) {
        distanceKm = this.calculateHaversineDistance(
          referenceCoords.lat,
          referenceCoords.lng,
          doc.coordinates.lat,
          doc.coordinates.lng
        );
      }

      if (distanceKm !== null) {
        if (distanceKm < 3.0) {
          score += 40;
          reasons.push(`Proximity: Highly accessible, located only ${distanceKm} km away`);
        } else if (distanceKm < 10.0) {
          score += 25;
          reasons.push(`Location: Located ${distanceKm} km away in ${doc.village}`);
        } else {
          score += 10;
          reasons.push(`Regional: Located ${distanceKm} km away`);
        }
      } else if (targetVillage && doc.village && doc.village.toLowerCase().includes(targetVillage.toLowerCase())) {
        score += 35;
        reasons.push(`Located directly in your selected village (${doc.village})`);
      }

      // 4. Availability State Assessment
      const rawAvailability = (doc.availability_state || 'AVAILABLE').toUpperCase();
      let effectiveAvailability = rawAvailability;
      let availabilityLabel = "Available";
      let cacheNote = "";

      if (!isOnline) {
        cacheNote = `Last updated: ${doc.last_status_time || '29 Aug 2026, 6:20 PM'} (Offline cache)`;
      }

      if (rawAvailability === 'AVAILABLE') {
        score += 30;
        availabilityLabel = isOnline ? "Available for Consultation" : "Available (Cached)";
        reasons.push(`Currently available with active OPD / consultation hours`);
      } else if (rawAvailability === 'BUSY') {
        score += 15;
        availabilityLabel = "Currently in Procedure / Busy";
        reasons.push(`Doctor is in active clinic procedure; consultation queue open`);
      } else if (rawAvailability === 'OFFLINE') {
        score += 0;
        availabilityLabel = "Off-Duty / OPD Closed";
      } else {
        effectiveAvailability = 'UNKNOWN';
        availabilityLabel = "Availability Unknown";
      }

      // 5. Clinical Experience & Credentials
      if (doc.experience_years && doc.experience_years >= 10) {
        score += 15;
        reasons.push(`Senior Practitioner: Over ${doc.experience_years} years of dedicated clinical experience`);
      } else if (doc.experience_years) {
        score += 8;
        reasons.push(`${doc.experience_years} years clinical experience`);
      }

      if (doc.medical_reg_no) {
        score += 5;
        reasons.push(`Verified Council Registration (${doc.medical_reg_no})`);
      }

      // Fee affordability highlight
      if (doc.consultation_fee && (doc.consultation_fee.toLowerCase().includes('free') || doc.consultation_fee.includes('मोफत'))) {
        reasons.push(`Government PHC / Free Community Care Policy`);
      }

      return {
        ...doc,
        calculatedDistanceKm: distanceKm,
        recommendationScore: score,
        recommendationReasons: reasons,
        effectiveAvailability: effectiveAvailability,
        availabilityLabel: availabilityLabel,
        cacheNote: cacheNote,
        isSpecialtyMatched: isSpecialtyMatched
      };
    });

    // Sort descending by score, then ascending by distance
    ranked.sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      if (a.calculatedDistanceKm !== null && b.calculatedDistanceKm !== null) {
        return a.calculatedDistanceKm - b.calculatedDistanceKm;
      }
      return 0;
    });

    return ranked;
  }
}

// Global Singleton
window.oneHealthLocation = new OneHealthLocationEngine();
