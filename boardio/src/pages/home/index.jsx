import { playClickSound } from "../../utils/constants";
import "./index.css";

const Home = ({ todos = [], handleOpenTicketModal }) => {
  return (
    <section>
      <div className="border-[0.5px] border-retro-green shadow-90s absolute bg-white my-14 ml-12 p-6">
        <div className="text-3xl font-black retro-green">Todos</div>
        <br />
        <hr />
        {todos.map((todo) => (
          <div
            key={todo._id}
            className="border-[0.5px] border-retro-green retro-green p-2 shadow-90s-btn w-64 mt-4 max-w-64"
            onClick={() => {
              playClickSound();
              handleOpenTicketModal(todo._id, "Update")
            }}
          >
            <div className="mb-2 font-black line-clamp-4">{todo.title}</div>
            <div className="text-xs line-clamp-6">{todo.description}</div>
          </div>
        ))}
        {todos.length == 0 && (
          <div className="retro-green text-xs max-w-64">
            List down your important tasks, i.e. Go fishing, Repair Hamza's
            typewriter In Shaa Allah etc..
            <br />
            <br />
            <br />
            ADD MASONARY LAYOUT LIKE COLUMNS... and move them like blender nodes.
          </div>
        )}
        <div
          className="w-64 max-w-64 shadow-90s-btn mt-4 py-1 px-2 border-retro-green border-[0.5px] bg-gray-400 text-white flex justify-between items-center"
          key={"new-ticket"}
          onClick={(e) => {
            playClickSound();
            handleOpenTicketModal(null, "Create");
          }}
        >
          <div>Create new Todo</div>
          <div className="text-2xl">+</div>
        </div>
      </div>
    </section>
  );
};

export default Home;
