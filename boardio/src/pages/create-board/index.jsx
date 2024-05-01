import './index.css';

const boards = [
    { name: "Machomon QA Logs", cursorColor: 'red' },
    { name: "Devkit", cursorColor: 'orange' },
    { name: "Robust Arena", cursorColor: 'indigo' },
    { name: "Mimisi", cursorColor: 'black' },
    { name: "Donrie", cursorColor: 'gray' },
    { name: "Mitochondria Lobelsi", cursorColor: 'pink' },
    { name: "E-Learner Kits", cursorColor: 'green' }
];


const CreateBoard = ({ router }) => {
  return (
    <section className='flex justify-center'>
      <div className="border-[0.5px] border-retro-green h-[80vh] retro-green py-12 px-12 m-12 bg-white absolute shadow-90s">
        <div className="text-[38px] font-black">Lets Hop In</div>
        <div className="font-light text-[14px]">
          Your active work-boards, make sure
          <br />
          to invite others so its not lonley..
        </div>
        <div className="flex justify-left flex-wrap max-w-72">
          {boards.map((board, index) => (
            <div
              key={index}
              onClick={() => new Audio("click_creatorassets.com.mp3").play()}
              className="m-[5px]  text-[14px] shadow-90s-btn border-[0.5px] border-retro-green px-4 py-2 flex justify-center items-center w-fit"
              style={{ boxShadow: `5px 5px ${board.cursorColor}` }}
            >
              <div>{board.name}</div>
            </div>
          ))}
        </div>
        <hr className="p-[0.25px] bg-[#696969] border-none mt-6" />
        <center className="mt-4 font-light text-[14px]">
          Otherwise, you can always..
        </center>
        <center className="font-black text-[14px] mb-4">
          Create a new board
        </center>
        <center>
            <input className='w-[211px] py-2 px-2 shadow-90s-input border-[0.5px] border-retro-green' placeholder='Board name here please..'/>
        </center>
        <div
            onClick={() => new Audio("click_creatorassets.com.mp3").play()}
            className="bg-[#D986D9] mt-4 ml-auto mr-auto align-center m-[5px]  text-[14px] shadow-90s-btn border-[0.5px] border-retro-green px-4 py-2 flex justify-center items-center w-fit"
        >
            <div className='text-white font-medium' onClick={() => router.push('/home')}>JUMP IN!!</div>
        </div>
      </div>
    </section>
  );
};

export default CreateBoard;
