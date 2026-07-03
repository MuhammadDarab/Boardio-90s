import React, { useEffect, useState } from "react";
import { BACKEND_ADDRESS, STAMP_TYPES } from "../../utils/constants";
import { addStamp, removeStamp, playClickSound } from "../../utils/utility";
import { authFetch } from "../../utils/auth";
import "./index.css";

function sameAttachments(a, b) {
  if (a.length !== b.length) return false;
  return a.every((attachment, index) => attachment.url === (b[index] && b[index].url));
}

function resolveUrl(url) {
  if (!url) return url;
  return url.startsWith("http") ? url : BACKEND_ADDRESS + url;
}

function toMonthInputValue(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getEmbedUrl(url) {
  const googleDocMatch = url.match(
    /^https?:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/]+)/
  );
  if (googleDocMatch) {
    return `https://docs.google.com/${googleDocMatch[1]}/d/${googleDocMatch[2]}/preview`;
  }
  const driveMatch = url.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  if (/\.pdf($|[?#])/i.test(url) && !url.includes("#")) {
    return `${url}#zoom=150`;
  }
  return url;
}

const Modal = ({
  handleOnClose,
  modalData,
  ticketType,
  isOpen,
  handleRefetch,
  showToast,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [stamps, setStamps] = useState([]);
  const [createdAtMonth, setCreatedAtMonth] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = React.useRef(null);

  function uploadAttachmentFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return authFetch(BACKEND_ADDRESS + "/upload-file", {
      method: "POST",
      body: formData,
    }).then((x) => x.json());
  }

  function handleAttachmentFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setIsUploadingFile(true);
    Promise.all(files.map(uploadAttachmentFile))
      .then((uploaded) => {
        setAttachments((prevAttachments) => [...prevAttachments, ...uploaded]);
      })
      .finally(() => setIsUploadingFile(false));
  }

  function resetFields() {
    setTitle("");
    setDescription("");
    setAttachments([]);
    setLinkUrl("");
  }

  function handleAddLink() {
    const url = linkUrl.trim();
    if (!url) return;
    let name = url;
    try {
      name = new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {}
    setAttachments((prevAttachments) => [...prevAttachments, { url, name, type: "link" }]);
    setLinkUrl("");
  }

  useEffect(() => {
    setTitle(modalData.title);
    setDescription(modalData.description);
    setAttachments(modalData.attachments || []);
    setStamps(modalData.stamps || []);
    setCreatedAtMonth(toMonthInputValue(modalData.createdAt));
  }, [modalData]);

  function handleAddStamp(type) {
    if (ticketType !== "Update") return;
    playClickSound();
    addStamp(modalData._id, type).then((stamp) => {
      setStamps((prevStamps) => [...prevStamps, stamp]);
      handleRefetch();
    });
  }

  function handleRemoveStamp(stampId) {
    if (ticketType !== "Update") return;
    playClickSound();
    setStamps((prevStamps) => prevStamps.filter((stamp) => stamp._id !== stampId));
    removeStamp(modalData._id, stampId).then(() => {
      handleRefetch();
    });
  }

  const isUnchanged =
    modalData.title === title &&
    modalData.description === description &&
    sameAttachments(modalData.attachments || [], attachments) &&
    toMonthInputValue(modalData.createdAt) === createdAtMonth;

  if (isOpen) {
    return (
      <div
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
        id="modal-bg"
        className="flex w-[100vw] h-[100vh] absolute justify-center items-center z-50"
        onClick={(e) => {
          if (e.target.id === "modal-bg") {
            resetFields();
            handleOnClose();
          }
        }}
      >
        <div className="flex bg-white shadow-90s border-retro-green border-[0.5px]">
          <div className="p-4 retro-green flex flex-col">
            <input
              type="text"
              className="text-3xl font-black border-[0.5px] border-retro-green shadow-90s-input my-2 mx-2 p-2"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="Ticket title over here! etc.."
            />
            <textarea
              rows={6}
              cols={60}
              placeholder="Enter detailed ticket description over here.."
              className="p-2 border-[0.5px] text-xl border-retro-green shadow-90s-input my-2 mx-2"
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              value={description}
            ></textarea>
            <div className="flex items-center gap-2 my-2 mx-2">
              <label className="text-sm font-black">When did this idea come?</label>
              <input
                type="month"
                className="p-1 border-[0.5px] border-retro-green shadow-90s-input"
                value={createdAtMonth}
                onChange={(e) => setCreatedAtMonth(e.target.value)}
              />
            </div>
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleAttachmentFilesSelected}
            />
            <div className="flex items-center gap-2 my-2 mx-2">
              <div
                className="w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 cursor-pointer"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                {isUploadingFile ? "Uploading.." : "Attach Images, Videos or Documents"}
              </div>
            </div>
            <div className="flex items-center gap-2 my-2 mx-2">
              <input
                type="text"
                placeholder="Paste a document link (Google Docs, PDF, etc..) and hit Enter"
                className="flex-1 p-1 text-sm border-[0.5px] border-retro-green shadow-90s-input"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLink();
                }}
              />
              <div
                className="w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 cursor-pointer"
                onClick={handleAddLink}
              >
                Add Link
              </div>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 my-2 mx-2">
                {attachments.map((attachment, index) => (
                  <div key={attachment.url + index} className="relative w-16 h-16">
                    {attachment.type === "image" && (
                      <img
                        src={resolveUrl(attachment.url)}
                        alt={attachment.name || "Ticket attachment thumbnail"}
                        className="w-16 h-16 object-cover border-[0.5px] border-retro-green cursor-pointer"
                        onClick={() => setLightboxAttachment(attachment)}
                      />
                    )}
                    {attachment.type === "video" && (
                      <video
                        src={resolveUrl(attachment.url)}
                        muted
                        className="w-16 h-16 object-cover border-[0.5px] border-retro-green cursor-pointer"
                        onClick={() => setLightboxAttachment(attachment)}
                      />
                    )}
                    {attachment.type === "document" && (
                      <div
                        className="w-16 h-16 flex flex-col items-center justify-center gap-1 border-[0.5px] border-retro-green cursor-pointer bg-gray-100 px-1"
                        title={attachment.name}
                        onClick={() => window.open(resolveUrl(attachment.url), "_blank")}
                      >
                        <div className="text-xl">&#128196;</div>
                        <div className="text-[9px] text-center line-clamp-2 break-all">
                          {attachment.name}
                        </div>
                      </div>
                    )}
                    {attachment.type === "link" && (
                      <div
                        className="w-16 h-16 flex flex-col items-center justify-center gap-1 border-[0.5px] border-retro-green cursor-pointer bg-gray-100 px-1"
                        title={attachment.name}
                        onClick={() => setLightboxAttachment(attachment)}
                      >
                        <div className="text-xl">&#128279;</div>
                        <div className="text-[9px] text-center line-clamp-2 break-all">
                          {attachment.name}
                        </div>
                      </div>
                    )}
                    <div
                      className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-400 text-white text-xs border-[0.5px] border-retro-green cursor-pointer"
                      title="Remove attachment"
                      onClick={() =>
                        setAttachments((prevAttachments) =>
                          prevAttachments.filter((_, i) => i !== index)
                        )
                      }
                    >
                      &times;
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex ml-auto">
              {ticketType == "Update" && (
                <div
                  className="m-2 w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3 bg-red-400 text-white"
                  onClick={() => {
                    if (modalData._id) {
                      authFetch(BACKEND_ADDRESS + "/delete-ticket", {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ ticketId: modalData._id }),
                      }).then(() => {
                        handleRefetch();
                        resetFields();
                        handleOnClose();
                        showToast("Ticket Deleted Successfully!");
                      });
                    }
                  }}
                >
                  Delete Ticket
                </div>
              )}
              <div
                className={`m-2 w-fit shadow-90s-input border-[0.5px] border-retro-green px-2 py-1 mb-3 ${
                  isUnchanged || title.trim() == "" || description.trim() == ""
                    ? "bg-gray-400 text-black"
                    : "bg-green-400 text-white"
                } `}
                onClick={() => {
                  if (!(isUnchanged || title.trim() == "" || description.trim() == "")) {
                    if (ticketType == "Create") {
                      authFetch(BACKEND_ADDRESS + "/create-ticket", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          title,
                          description,
                          attachments,
                          columnId: modalData.columnId,
                          createdAt: createdAtMonth ? `${createdAtMonth}-01` : undefined,
                        }),
                      }).then(() => {
                        handleRefetch();
                        resetFields();
                        handleOnClose();
                        showToast("Ticket created Successfully!");
                      });
                    } else if (ticketType == "Update") {
                      authFetch(BACKEND_ADDRESS + "/update-ticket", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          ticketId: modalData._id,
                          title,
                          description,
                          attachments,
                          createdAt: createdAtMonth ? `${createdAtMonth}-01` : undefined,
                        }),
                      }).then(() => {
                        handleRefetch();
                        resetFields();
                        handleOnClose();
                        showToast("Ticket updated Successfully!");
                      });
                    }
                  }
                }}
              >
                {ticketType} Ticket
              </div>
            </div>
          </div>
          <div className="pr-4 pt-6 pl-2 retro-green shadow-90s-input w-44">
            <div className="font-black text-sm mb-2 px-1">Rubber Stamps</div>
            {ticketType === "Update" ? (
              <>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {STAMP_TYPES.map((stampType) => {
                    const alreadyApplied = stamps.some((s) => s.type === stampType.type);
                    return (
                      <div
                        key={stampType.type}
                        className={`border-[0.5px] border-retro-green px-1 py-1 text-center text-xs ${alreadyApplied ? "opacity-30 cursor-not-allowed" : "shadow-90s-btn cursor-pointer"}`}
                        style={{ backgroundColor: alreadyApplied ? "gray" : stampType.color, color: "white" }}
                        title={alreadyApplied ? `Already stamped "${stampType.label}"` : `Stamp "${stampType.label}"`}
                        onClick={() => !alreadyApplied && handleAddStamp(stampType.type)}
                      >
                        <div className="text-base">{stampType.emoji}</div>
                        {stampType.label}
                      </div>
                    );
                  })}
                </div>
                {stamps.length > 0 && (
                  <>
                    <div className="font-black text-sm mb-2 px-1">Active Stamps</div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {stamps.map((stamp) => {
                        const stampType = STAMP_TYPES.find((s) => s.type === stamp.type) || {};
                        return (
                          <div
                            key={stamp._id}
                            className="shadow-90s-btn border-[0.5px] border-retro-green px-1 py-1 text-xs cursor-pointer flex items-center gap-1"
                            style={{ backgroundColor: stampType.color, color: "white" }}
                            title="Click to remove this stamp"
                            onClick={() => handleRemoveStamp(stamp._id)}
                          >
                            {stampType.emoji} {stampType.label} &times;
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-xs px-1">Save the ticket first to start stamping it!</div>
            )}
          </div>
        </div>
        {lightboxAttachment && (
          <div
            style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
            className="flex w-[100vw] h-[100vh] fixed top-0 left-0 justify-center items-center z-[100]"
            onClick={() => setLightboxAttachment(null)}
          >
            {lightboxAttachment.type === "video" ? (
              <video
                src={resolveUrl(lightboxAttachment.url)}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[85vw] object-contain"
                onClick={(ev) => ev.stopPropagation()}
              />
            ) : lightboxAttachment.type === "link" ? (
              <div
                className="flex flex-col w-[85vw] h-[85vh] bg-white border-[0.5px] border-retro-green"
                onClick={(ev) => ev.stopPropagation()}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b-[0.5px] border-retro-green text-xs retro-green">
                  <span className="truncate">{lightboxAttachment.name}</span>
                  <a
                    href={lightboxAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline shrink-0 ml-2"
                  >
                    Open in new tab
                  </a>
                </div>
                <div className="flex-1 w-full overflow-auto">
                  <iframe
                    src={getEmbedUrl(lightboxAttachment.url)}
                    title={lightboxAttachment.name}
                    className="w-full h-full"
                    style={{ zoom: "150%" }}
                  />
                </div>
              </div>
            ) : (
              <img
                src={resolveUrl(lightboxAttachment.url)}
                alt="Full size attachment"
                className="max-h-[85vh] max-w-[85vw] object-contain"
              />
            )}
          </div>
        )}
      </div>
    );
  }
};

export default Modal;
