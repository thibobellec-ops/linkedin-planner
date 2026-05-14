import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Récupérer tous les posts depuis la base SQLite
 */
export const getPosts = async () => {
  const response = await axios.get(`${API_BASE}/posts`);
  return response.data;
};

/**
 * Créer un nouveau post
 * @param {{ title, content, status, planned_date }} postData
 */
export const createPost = async (postData) => {
  const response = await axios.post(`${API_BASE}/posts`, postData);
  return response.data;
};

/**
 * Mettre à jour un post existant (mise à jour partielle)
 * @param {number} postId
 * @param {object} postData - Champs à mettre à jour
 */
export const updatePost = async (postId, postData) => {
  const response = await axios.put(`${API_BASE}/posts/${postId}`, postData);
  return response.data;
};

/**
 * Supprimer définitivement un post
 * @param {number} postId
 */
export const deletePost = async (postId) => {
  const response = await axios.delete(`${API_BASE}/posts/${postId}`);
  return response.data;
};

/**
 * Importer des posts depuis un texte collé (page LinkedIn)
 * @param {string} text
 */
export const importFromText = async (text) => {
  const response = await axios.post(`${API_BASE}/import/text`, { text });
  return response.data;
};
