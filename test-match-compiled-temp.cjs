"use strict";
/**
 * Villa and Complex Matcher Utility
 * Accurately normalizes and matches property and unit names between PMS (Hospara),
 * Google Sheets, and User Access Control (assignedComplexes / assignedUnits).
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_PROPERTY_MAPPINGS = void 0;
exports.loadVillaMappings = loadVillaMappings;
exports.resolveReservationProperty = resolveReservationProperty;
exports.matchesProperty = matchesProperty;
exports.isReservationAssignedToUser = isReservationAssignedToUser;
var firestore_1 = {};
var auth_1 = {}; // Assuming db is exported from auth or db.ts
// Fallback canonical sheet mappings (used if DB fetch fails or hasn't completed)
exports.KNOWN_PROPERTY_MAPPINGS = [
    // Dragon Stone Villas
    { pattern: /DGS[-_ ]*V0*(\d+)/i, complex: "Dragon Stone Villas", unitPrefix: "DragonStone V" },
    // Dragon Stone Suites / Apartments
    { pattern: /DGS[-_ ]*A0*(\d+)/i, complex: "Dragon Stone Suites", unitPrefix: "DragonStone A" },
    // Sacred Jungle Villas (Phase 1 & 2)
    { pattern: /SCJ[-_ ]*0*([1-3])V/i, complex: "Sacred Jungle Villas", unitPrefix: "SJ 1 Villa " },
    { pattern: /SCJ[-_ ]*0*([4-6])V/i, complex: "Sacred Jungle Villas 2", unitPrefix: "SJ 2 Villa " },
    // Sacred Jungle Suites / Apartments
    { pattern: /SCJ[-_ ]*0*1A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 1 (Mezanine)" },
    { pattern: /SCJ[-_ ]*0*2A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 2 (Mezanine)" },
    { pattern: /SCJ[-_ ]*0*3A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 3 (Mezanine)" },
    { pattern: /SCJ[-_ ]*0*9A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 9 (2BDr)" },
    { pattern: /SCJ[-_ ]*0*(\d+)A/i, complex: "Sacred Jungle Suites", unitPrefix: "SJ Apart " },
    // Sarang Apartments
    { pattern: /SRG[-_ ]*0*(\d+)/i, complex: "Sarang Aprt.", unitPrefix: "Sarang Apart. " },
    // Sebelas Apartments
    { pattern: /SEB[-_ ]*0*9A/i, complex: "Sebelas Aprt.", unit: "Sebelas Aprt. 9 (2BDr)" },
    { pattern: /SEB[-_ ]*0*11A/i, complex: "Sebelas Aprt.", unit: "Sebelas Aprt. 11 (3BDr)" },
    { pattern: /SEB[-_ ]*0*(\d+)A?/i, complex: "Sebelas Aprt.", unitPrefix: "Sebelas Aprt. " },
    // Orchid Garden Villa
    { pattern: /OGV[-_ ]*V0*(\d+)/i, complex: "Orchid Garden Villa", unitPrefix: "Orchid Garden Villa " },
    // Standalone Villas
    { pattern: /HTN[-_ ]*0*1|hutan/i, complex: "Villas", unit: "Hutan Villa" },
    { pattern: /RMH[-_ ]*0*1|rumah/i, complex: "Villas", unit: "Rumah Villa" },
    { pattern: /TTB[-_ ]*0*1|tropical/i, complex: "Villas", unit: "Tropical Tribe Villa" },
    { pattern: /HIJ[-_ ]*0*1|hijau/i, complex: "Villas", unit: "Hijau Villa" },
    { pattern: /MNL[-_ ]*0*1|moonlight/i, complex: "Villas", unit: "Moonlight" },
    { pattern: /TBG[-_ ]*0*1|tembaga/i, complex: "Villas", unit: "Tembaga Villa" },
    { pattern: /PUS[-_ ]*0*1|putri\s*salju/i, complex: "Villas", unit: "Putri Salju" },
    { pattern: /SMR[-_ ]*0*1|semiramida/i, complex: "Villas", unit: "Semiramida" },
    { pattern: /GDH[-_ ]*0*1|garden\s*height/i, complex: "Villas", unit: "Garden Hights Villa" },
    { pattern: /nyaman.*1/i, complex: "Villas", unit: "Nyaman Villa 1 (1BDr)" },
    { pattern: /nyaman.*2/i, complex: "Villas", unit: "Nyaman Villa 2 (1BDr)" },
    { pattern: /nyaman.*3/i, complex: "Villas", unit: "Nyaman Villa 3 (2BDr)" },
];
var dynamicMappings = [];
var isMappingsLoaded = false;
/**
 * Load dynamic mappings from Firestore
 */
function loadVillaMappings() {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot, records_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isMappingsLoaded)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(auth_1.db, "villaMappings"))];
                case 2:
                    snapshot = _a.sent();
                    records_1 = [];
                    snapshot.forEach(function (doc) {
                        var data = doc.data();
                        if (data.guestyNickname) {
                            records_1.push({
                                guestyNickname: data.guestyNickname,
                                complexType: data.complexType || "Villas",
                                unitName: data.unitName || data.guestyNickname,
                            });
                        }
                    });
                    dynamicMappings = records_1;
                    isMappingsLoaded = true;
                    console.log("Loaded ".concat(records_1.length, " dynamic villa mappings."));
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error("Failed to load villa mappings:", err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Resolves raw reservation villa string / fields into normalized complex & unit names
 */
function resolveReservationProperty(res) {
    if (!res || typeof res !== 'object') {
        return {
            complexName: 'Unknown',
            unitName: 'Unknown',
            displayName: 'Unknown'
        };
    }
    var rawVilla = (res.villa || res.villaName || '').trim();
    var rawComplex = (res.complexName || res.complex || '').trim();
    var rawUnit = (res.unitName || res.unit || '').trim();
    var combined = "".concat(rawVilla, " ").concat(rawComplex, " ").concat(rawUnit).trim();
    // First try dynamic mappings exactly or partially matching
    if (isMappingsLoaded && dynamicMappings.length > 0) {
        for (var _i = 0, dynamicMappings_1 = dynamicMappings; _i < dynamicMappings_1.length; _i++) {
            var mapping = dynamicMappings_1[_i];
            if (combined.toLowerCase().includes(mapping.guestyNickname.toLowerCase()) ||
                rawVilla.toLowerCase() === mapping.guestyNickname.toLowerCase()) {
                return {
                    complexName: mapping.complexType,
                    unitName: mapping.unitName,
                    displayName: "".concat(mapping.complexType, " \u2022 ").concat(mapping.unitName)
                };
            }
        }
    }
    for (var _a = 0, KNOWN_PROPERTY_MAPPINGS_1 = exports.KNOWN_PROPERTY_MAPPINGS; _a < KNOWN_PROPERTY_MAPPINGS_1.length; _a++) {
        var mapping = KNOWN_PROPERTY_MAPPINGS_1[_a];
        var match = combined.match(mapping.pattern);
        if (match) {
            var unit = mapping.unit;
            if (!unit && mapping.unitPrefix && match[1]) {
                unit = "".concat(mapping.unitPrefix).concat(parseInt(match[1], 10));
            }
            if (!unit) {
                unit = rawUnit || rawVilla || mapping.complex;
            }
            return {
                complexName: mapping.complex,
                unitName: unit,
                displayName: "".concat(mapping.complex, " \u2022 ").concat(unit)
            };
        }
    }
    // Fallback heuristic if not matched by regex
    var fallbackComplex = rawComplex || rawVilla || "Unknown";
    var fallbackUnit = rawUnit || rawVilla || fallbackComplex;
    return {
        complexName: fallbackComplex,
        unitName: fallbackUnit,
        displayName: rawComplex && rawUnit && rawComplex !== rawUnit ? "".concat(rawComplex, " \u2022 ").concat(rawUnit) : (rawUnit || rawComplex || rawVilla || 'Unknown')
    };
}
/**
 * Normalizes a string for comparison (strips punctuation, extra whitespace, lowercase)
 */
function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Determines whether two property or unit strings refer to the same property
 */
function matchesProperty(candidate, target) {
    if (!candidate || !target)
        return false;
    var cNorm = normalizeStr(candidate);
    var tNorm = normalizeStr(target);
    if (cNorm === tNorm)
        return true;
    if (cNorm.replace(/\s+/g, '') === tNorm.replace(/\s+/g, ''))
        return true;
    var cWords = cNorm.split(' ').filter(function (w) { return w.length > 0; });
    var tWords = tNorm.split(' ').filter(function (w) { return w.length > 0; });
    function getFreq(words) {
        var f = {};
        for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
            var w = words_1[_i];
            f[w] = (f[w] || 0) + 1;
        }
        return f;
    }
    var cFreq = getFreq(cWords);
    var tFreq = getFreq(tWords);
    var cSubsetOfT = true;
    var tSubsetOfC = true;
    for (var _i = 0, cWords_1 = cWords; _i < cWords_1.length; _i++) {
        var w = cWords_1[_i];
        if ((cFreq[w] || 0) > (tFreq[w] || 0))
            cSubsetOfT = false;
    }
    for (var _a = 0, tWords_1 = tWords; _a < tWords_1.length; _a++) {
        var w = tWords_1[_a];
        if ((tFreq[w] || 0) > (cFreq[w] || 0))
            tSubsetOfC = false;
    }
    if (cSubsetOfT)
        return true;
    return false;
}
/**
 * Checks if a reservation belongs to the complexes / units assigned to a user
 */
function isReservationAssignedToUser(reservation, currentUser) {
    var _a;
    if (!currentUser)
        return true;
    if (!reservation)
        return false;
    var assignedComplexes = currentUser.assignedComplexes || [];
    var assignedUnits = currentUser.assignedUnits || [];
    // Super administrator with no restrictions sees all
    var isSuper = ((_a = currentUser.email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'roman@evdekimi.com';
    if (isSuper && assignedComplexes.length === 0 && assignedUnits.length === 0) {
        return true;
    }
    // If user has admin or supervisor role and has not selected specific villas/units, show all
    if ((currentUser.role === 'admin' || currentUser.role === 'supervisor') && assignedComplexes.length === 0 && assignedUnits.length === 0) {
        return true;
    }
    // If no assignments configured, non-admins might not see any or see all
    if (assignedComplexes.length === 0 && assignedUnits.length === 0) {
        return currentUser.role === 'admin' || currentUser.role === 'supervisor';
    }
    var resolved = resolveReservationProperty(reservation);
    var resComplex = resolved.complexName;
    var resUnit = resolved.unitName;
    var rawVilla = reservation.villa || reservation.villaName || '';
    // 1. Check if reservation matches any of the assigned units
    if (assignedUnits.length > 0) {
        var unitMatch = assignedUnits.some(function (userUnit) {
            return (matchesProperty(userUnit, resUnit) ||
                matchesProperty(userUnit, rawVilla) ||
                matchesProperty(userUnit, "".concat(resComplex, " ").concat(resUnit)));
        });
        // Frontdesk users with specific unit assignments are strictly bounded to those units
        if (currentUser.role === 'frontdesk') {
            return unitMatch;
        }
        if (unitMatch)
            return true;
    }
    // 2. Check if reservation matches any of the assigned complexes
    if (assignedComplexes.length > 0) {
        var complexMatch = assignedComplexes.some(function (userComplex) {
            return (matchesProperty(userComplex, resComplex) ||
                matchesProperty(userComplex, rawVilla) ||
                matchesProperty(userComplex, "".concat(resComplex, " ").concat(resUnit)));
        });
        if (complexMatch)
            return true;
    }
    return false;
}
