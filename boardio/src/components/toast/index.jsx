import { useEffect, useState } from "react";

const Toast = ({message, isOpen, handleOnExit, delay = 2000}) => {
  const [toastTimer, setToastTimer] = useState(-1);
  
  useEffect(() => {
    if (toastTimer != -1) {
      clearInterval(toastTimer);
    }
    setToastTimer(setTimeout(() => handleOnExit(), delay));
  }, [isOpen])

  if (isOpen) {
    return (
      <div className="retro-green absolute bottom-0 right-0 m-12 p-8 bg-white border-retro-green border-[0.5px] shadow-90s">
        <span>{message}</span>
      </div>
    );
  } else return <></>
};

export default Toast;
