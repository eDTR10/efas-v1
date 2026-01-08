import axios from "axios";

// Google Sheets API Configuration
const GOOGLE_SHEETS_API_KEY = "AIzaSyD1Kh-Fy2le4-MaL4Ryo_yvfKs5ka5UIHs";

// Default spreadsheets
const DEFAULT_SPREADSHEETS = {
  MDS_REG_R10: "11pC_pyDKZa797p_HUwt_PCfb7PLJUAtMDsfZ0MPepB4",
  RAOD_2024: "1U4P9Up-0xNUlSsIX2DiIAIUZjnliHK8nAKMhQB7wXik",
};

// Get spreadsheets from local storage or use defaults
export const getSpreadsheets = () => {
  try {
    const stored = localStorage.getItem("sheetSettings");
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        MDS_REG_R10: settings.mdsRegR10Id,
        RAOD_2024: settings.raod2024Id,
      };
    }
  } catch {
    console.log("Using default spreadsheet IDs");
  }
  return DEFAULT_SPREADSHEETS;
};

export const SPREADSHEETS = getSpreadsheets();

// Create axios instance for Google Sheets API
const googleSheetsAPI = axios.create({
  baseURL: "https://sheets.googleapis.com/v4/spreadsheets",
  params: {
    key: GOOGLE_SHEETS_API_KEY,
  },
});

/**
 * Read data from a specific range in a Google Sheet
 * @param spreadsheetId - The spreadsheet ID (or use SPREADSHEETS object)
 * @param range - Sheet range (e.g., "Sheet1!A1:D10" or "Sheet1!A:D")
 */
export const readSheetData = async (
  spreadsheetId: string,
  range: string
) => {
  try {
    const response = await googleSheetsAPI.get(
      `/${spreadsheetId}/values/${range}`
    );
    return response.data.values;
  } catch (error) {
    console.error("Error reading sheet:", error);
    throw error;
  }
};

/**
 * Write data to a specific range in a Google Sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param range - Sheet range (e.g., "Sheet1!A1:D10")
 * @param values - 2D array of values to write
 */
export const writeSheetData = async (
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) => {
  try {
    const response = await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`,
      {
        range,
        majorDimension: "ROWS",
        values,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error writing to sheet:", error);
    throw error;
  }
};

/**
 * Append data to a Google Sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param range - Sheet range (e.g., "Sheet1!A:D")
 * @param values - 2D array of values to append
 */
export const appendSheetData = async (
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) => {
  try {
    const response = await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?key=${GOOGLE_SHEETS_API_KEY}`,
      {
        range,
        majorDimension: "ROWS",
        values,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error appending to sheet:", error);
    throw error;
  }
};

/**
 * Clear a range in a Google Sheet
 * @param spreadsheetId - The spreadsheet ID
 * @param range - Sheet range (e.g., "Sheet1!A1:D10")
 */
export const clearSheetData = async (
  spreadsheetId: string,
  range: string
) => {
  try {
    const response = await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear?key=${GOOGLE_SHEETS_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error clearing sheet:", error);
    throw error;
  }
};

/**
 * Get sheet metadata (all sheets in the spreadsheet)
 * @param spreadsheetId - The spreadsheet ID
 */
export const getSheetMetadata = async (spreadsheetId: string) => {
  try {
    const response = await googleSheetsAPI.get(
      `/${spreadsheetId}?fields=sheets.properties`
    );
    return response.data.sheets;
  } catch (error) {
    console.error("Error getting sheet metadata:", error);
    throw error;
  }
};

export default googleSheetsAPI;
