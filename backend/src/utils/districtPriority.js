/**
 * District priority for donor search (same district → nearby → rest).
 * Re-exports from districtNeighbors for chatbot and availability endpoint.
 */

export { getDistrictExpansionOrder } from './districtNeighbors.js';
