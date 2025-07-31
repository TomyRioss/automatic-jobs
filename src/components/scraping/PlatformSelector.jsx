// src/components/scraping/PlatformSelector.jsx
export default function PlatformSelector({ platform, handleInputChange }) {
  return (
    <div>
      <label className="block font-medium">Platform</label>
      <select
        name="platform"
        value={platform}
        onChange={handleInputChange}
        className="w-full p-2 border rounded"
      >
        <option value="linkedin">LinkedIn</option>
        <option value="bumeran">Bumeran</option>
        <option value="zonajobs">ZonaJobs</option>
      </select>
    </div>
  );
}
