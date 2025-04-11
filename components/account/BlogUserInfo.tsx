import { Input } from '@nextui-org/react';
import { useMap } from 'react-use';
import { useEffect } from 'react';
interface Props {
  info: any;
  onChange?: (data: any) => void;
}
export const BlogUserInfo = ({ onChange, info = {} }: Props) => {
  const [data, { set }] = useMap<any>({
    avatar: '',
    name: '',
    desc: '',
    twitter: '',
    website: '',
    email: '',
    facebook: '',
  });
  useEffect(() => {
    onChange?.(data);
  }, [data]);
  useEffect(() => {
    set('avatar', info.avatar);
    set('name', info.name);
    set('desc', info.desc);
    set('twitter', info.twitter);
    set('website', info.website);
    set('email', info.email);
    set('emafacebookil', info.facebook);
  }, []);
  return (
    <div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Avatar</span>
        <Input
          placeholder="Image Inscription Id"
          value={data.avatar}
          onValueChange={(v) => set('avatar', v)}
        ></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Nick Name</span>
        <Input value={data.name} onValueChange={(v) => set('name', v)}></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Description</span>
        <Input value={data.desc} onValueChange={(v) => set('desc', v)}></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Twitter</span>
        <Input
          placeholder="link url"
          value={data.twitter}
          onValueChange={(v) => set('twitter', v)}
        ></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Facebook</span>
        <Input
          placeholder="link url"
          value={data.facebook}
          onValueChange={(v) => set('facebook', v)}
        ></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Website</span>
        <Input
          placeholder="link url"
          value={data.website}
          onValueChange={(v) => set('website', v)}
        ></Input>
      </div>
      <div className="flex justify-center items-center mb-2 ">
        <span className="w-40">Email</span>
        <Input
          placeholder="email"
          value={data.email}
          onValueChange={(v) => set('email', v)}
        ></Input>
      </div>
    </div>
  );
};
