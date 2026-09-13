export type Message = { role: "user" | "assistant"; content: string; regenerate_index?: number };
export type Conversation = { id: string; title: string; persona_id?: string; updated_at?: string };
export type Persona = {
  id: string;
  name: string;
  title?: string;
  system_prompt: string;
  about?: string;
  greeting?: string;
  personality?: string;
  created_by?: string;
  user_id?: number;
  avatar_url?: string | null;
  likes?: number;
  dislikes?: number;
  categories?: string;
  favorite?: boolean;
};
export type Category = { name: string };
export type PersonaReactions = {
  likes: number;
  dislikes: number;
  my_reaction: "like" | "dislike" | null;
};
export type PersonaFavorite = {
  favorite: boolean;
};
export type UserProfile = {
  id?: number;
  username: string;
  email?: string;
  display_name: string;
  about_me: string;
  avatar_url?: string | null;
  gender?: string;
  is_admin?: boolean;
};
