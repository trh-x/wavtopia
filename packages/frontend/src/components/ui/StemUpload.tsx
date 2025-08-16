import { BaseDropZone } from "./BaseDropZone";

export interface StemFile {
  file: File;
  name: string;
  type: string;
}

interface StemUploadProps {
  stemFiles: StemFile[];
  onStemFilesChange: (stems: StemFile[]) => void;
  disabled?: boolean;
  maxStems?: number;
}

export function StemUpload({
  stemFiles,
  onStemFilesChange,
  disabled = false,
  maxStems = 20,
}: StemUploadProps) {
  const handleFileSelect = (files: File[]) => {
    const audioFiles = files.filter((file) =>
      file.name.toLowerCase().match(/\.(wav|flac)$/)
    );

    const newStems: StemFile[] = audioFiles
      .slice(0, maxStems - stemFiles.length)
      .map((file) => ({
        file,
        name: file.name.replace(/\.(wav|flac)$/i, ""),
        type: "audio",
      }));

    onStemFilesChange([...stemFiles, ...newStems]);
  };

  const handleStemNameChange = (index: number, name: string) => {
    const updatedStems = [...stemFiles];
    updatedStems[index] = { ...updatedStems[index], name };
    onStemFilesChange(updatedStems);
  };

  const handleStemTypeChange = (index: number, type: string) => {
    const updatedStems = [...stemFiles];
    updatedStems[index] = { ...updatedStems[index], type };
    onStemFilesChange(updatedStems);
  };

  const handleRemoveStem = (index: number) => {
    const updatedStems = stemFiles.filter((_, i) => i !== index);
    onStemFilesChange(updatedStems);
  };

  const canAddMore = stemFiles.length < maxStems;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Stem Files (Optional)</h3>
        <span className="text-sm text-gray-500">
          {stemFiles.length} / {maxStems} stems
        </span>
      </div>

      {/* Existing stems list */}
      {stemFiles.length > 0 && (
        <div className="space-y-3">
          {stemFiles.map((stem, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-gray-50"
            >
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stem Name
                  </label>
                  <input
                    type="text"
                    value={stem.name}
                    onChange={(e) =>
                      handleStemNameChange(index, e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Drums, Bass, Vocals"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={stem.type}
                    onChange={(e) =>
                      handleStemTypeChange(index, e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={disabled}
                  >
                    <option value="audio">Audio</option>
                    <option value="drums">Drums</option>
                    <option value="bass">Bass</option>
                    <option value="vocals">Vocals</option>
                    <option value="lead">Lead</option>
                    <option value="synth">Synth</option>
                    <option value="guitar">Guitar</option>
                    <option value="keys">Keys</option>
                    <option value="fx">FX</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">
                  {stem.file.name.split(".").pop()?.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {(stem.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  onClick={() => handleRemoveStem(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add more stems dropzone */}
      {canAddMore && (
        <BaseDropZone
          onFileSelect={handleFileSelect}
          disabled={disabled}
          multiple={true}
          accept=".wav,.flac"
        >
          <div className="text-center py-6">
            <p className="text-lg font-medium">
              {stemFiles.length === 0
                ? "Drop stem files here"
                : "Add more stems"}
            </p>
            <div className="text-sm text-gray-500 mt-1">
              <p>.wav, .flac files only</p>
              <p>Click to select files or drag and drop</p>
            </div>
          </div>
        </BaseDropZone>
      )}

      {stemFiles.length === 0 && (
        <p className="text-sm text-gray-600">
          Stem files are optional. If you have separated your track into
          individual instrument stems (drums, bass, vocals, etc.), you can
          upload them here to provide listeners with more control over the mix.
        </p>
      )}
    </div>
  );
}
