import { useChat } from '../context/ChatContext';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';

/**
 * Main chat layout — WhatsApp-inspired split view.
 * Sidebar on the left, chat window on the right.
 * On mobile, shows one or the other.
 */
const HomePage = () => {
  const { selectedChat } = useChat();

  return (
    <div className="h-screen flex overflow-hidden theme-bg">
      {/* Sidebar — always visible on desktop, conditional on mobile */}
      <div
        className={`w-full lg:w-96 lg:shrink-0 border-r theme-border-subtle
          ${selectedChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}
      >
        <Sidebar />
      </div>

      {/* Chat window */}
      <div
        className={`flex-1 ${selectedChat ? 'flex' : 'hidden lg:flex'}`}
      >
        <ChatWindow />
      </div>
    </div>
  );
};

export default HomePage;
