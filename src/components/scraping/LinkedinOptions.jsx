// src/components/scraping/LinkedinOptions.jsx
export default function LinkedinOptions({
  location,
  modalities,
  handleInputChange,
  handleModalityChange,
}) {
  return (
    <>
      <div>
        <label className="block font-medium">Location (Optional)</label>
        <input
          type="text"
          name="location"
          value={location}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Work Modalities (Optional)</label>
        <div className="flex gap-4">
          <label>
            <input
              type="checkbox"
              value="remoto"
              checked={modalities.includes("remoto")}
              onChange={handleModalityChange}
            />{" "}
            Remote
          </label>
          <label>
            <input
              type="checkbox"
              value="hibrido"
              checked={modalities.includes("hibrido")}
              onChange={handleModalityChange}
            />{" "}
            Hybrid
          </label>
          <label>
            <input
              type="checkbox"
              value="presencial"
              checked={modalities.includes("presencial")}
              onChange={handleModalityChange}
            />{" "}
            On-site
          </label>
        </div>
      </div>
    </>
  );
}
