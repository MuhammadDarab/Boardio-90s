import "./index.css";

const Login = ({ router }) => {

  return (
    <section>
      <div className="border-[0.5px] border-retro-green h-[70vh] retro-green py-12 px-16 m-24 bg-white absolute shadow-90s">
        <div className="text-[34px] font-black">Boardio</div>
        <div className="font-light text-[14px]">
          Your own personal 90’s themed
          <br />
          ticked collaboration area!
        </div>
        <hr className="p-[0.25px] bg-[#696969] border-none mt-6" />
        <center className="mt-4 font-black text-[14px] mb-4">
          Get started with
        </center>
        <div className="flex justify-center flex-col">
          <div onClick={() => {
            new Audio('click.mp3').play();
            router.push('/create-board')
          }} className=" text-[14px] shadow-90s-btn border-[0.5px] border-retro-green px-[2px] py-2 flex justify-center items-center">
            <div className="mr-3">
              <img width={28} src={"devicon_google.png"} />
            </div>
            <div className="mr-3">Sign in with Google</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
