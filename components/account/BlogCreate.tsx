'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BlogNameSelect } from '@/components/BlogNameSelect';
import { useInscribeStore, useBlogStore } from '@/store';
import { ordx } from '@/api';
import { tryit } from 'radash';
import { BlogUserInfo } from './BlogUserInfo';
import { useRouter } from 'next/navigation';
import { Textarea, Button, Input } from '@nextui-org/react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { notification, Select } from 'antd';
import { useMap } from 'react-use';
import { useTranslation } from 'react-i18next';

export function BlogCreate() {
  const { t } = useTranslation();
  const nav = useRouter();
  const [checkAvatarLoading, setCheckAvatarLoading] = useState(false);
  const [selectName, setSelectName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [nsData, setNsData] = useState<any>();
  const [checkStatus, setCheckStatus] = useState(false);
  const [templateInscriptionId, setTemplateInscriptionId] = useState('');
  const [prevInscriptionId, setPrevInscriptionId] = useState('');
  const { inscriptionId, reset: resetBlogStore } = useBlogStore();
  const [originPersonalInfo, setOriginPersonalInfo] = useState<any>({});
  const { network, address } = useReactWalletStore();
  const { setData: setInscribeData, reset: resetInscribeData } =
    useInscribeStore();
  const [personalInfo, { set: setPersonal, reset }] = useMap<any>({
    avatar: '',
    name: '',
    desc: '',
    twitter: '',
    website: '',
    email: '',
    facebook: '',
  });

  const checkHandler = async () => {
    setCheckStatus(false);
    await getNsName();
  };
  // const defaultTemplateInscriptionId =
  //   '83c896e5fb054595a8dc604b29e3262acac7ad1523e30422fd427fa29f994a83i0';
  const defaultTemplateInscriptionId = useMemo(() => {
    return network === 'testnet'
      ? 'fa8d3086b679985125f000a63a0f533d04b35c3fb97fd70e2f47e708e5ec13d8i0'
      : '85ee4d912f36352f04dcb8a323f4193c9a341f23e5dc1ae1477ecebdc4195672i0';
  }, [network]);
  const mintTemplate = async () => {
    resetInscribeData();
    setInscribeData({
      type: 'blog',
      mode: 'template',
      relateInscriptionId: defaultTemplateInscriptionId,
      metadata: {
        op: 'update',
        name: selectName,
        key: 'template_blog',
      },
      text: 'template_blog',
    });
    nav.push('/inscribe?source=blog');
  };
  const mintRouting = async () => {
    setInscribeData({
      type: 'text',
      mode: 'routing',
      text: JSON.stringify({
        p: 'btcname',
        op: 'routing',
        name: selectName,
        ord_handle: 'www',
        ord_index: templateInscriptionId,
      }),
    });
    // resetBlogStore()
    nav.push('/inscribe?source=blog');
  };
  const preview = () => {
    window.open(previewUrl, '_blank');
  };
  const publishHandler = async () => {
    const params = {
      p: 'sns',
      op: 'update',
      name: selectName,
      [`blog_${+new Date()}`]: content.replace('\n', '<br/>'),
    };
    setInscribeData({
      type: 'text',
      text: JSON.stringify(params),
    });
    nav.push('/inscribe?source=blog');
  };
  const mintPersonal = async () => {
    const params: any = {
      p: 'sns',
      op: 'update',
      name: selectName,
    };
    if (
      !!personalInfo.avatar &&
      personalInfo.avatar !== originPersonalInfo.avatar
    ) {
      params.avatar = personalInfo.avatar;
    }
    if (!!personalInfo.name && personalInfo.name !== originPersonalInfo.name) {
      params.personal_name = personalInfo.name;
    }
    if (!!personalInfo.desc && personalInfo.desc !== originPersonalInfo.desc) {
      params.personal_desc = personalInfo.desc;
    }
    if (
      !!personalInfo.website &&
      personalInfo.website !== originPersonalInfo.website
    ) {
      params.personal_website = personalInfo.website;
    }
    if (
      !!personalInfo.email &&
      personalInfo.email !== originPersonalInfo.email
    ) {
      params.personal_email = personalInfo.email;
    }
    if (
      !!personalInfo.twitter &&
      personalInfo.twitter !== originPersonalInfo.twitter
    ) {
      params.personal_twitter = personalInfo.twitter;
    }
    if (
      !!personalInfo.facebook &&
      personalInfo.facebook !== originPersonalInfo.facebook
    ) {
      params.personal_facebook = personalInfo.facebook;
    }
    setCheckAvatarLoading(true);
    console.log('params', params);

    const [err, res] = await tryit(ordx.getInscriptiontInfo)({
      network,
      inscriptionId: personalInfo.avatar,
    });
    setCheckAvatarLoading(false);
    if (res.code !== 0 || res?.data?.address !== address) {
      notification.error({
        message: 'Error',
        description: 'You can only mint your own personal blog.',
      });
      return;
    }
    setInscribeData({
      type: 'text',
      text: JSON.stringify(params),
    });
    nav.push('/inscribe?source=blog');
  };
  const previewUrl = useMemo(() => {
    return network !== 'testnet'
      ? `https://${selectName}.deweb.me`
      : `https://${selectName}.dkvs.xyz`;
  }, [network, selectName]);
  const getNsName = async () => {
    if (!selectName) {
      return;
    }
    setLoading(true);
    const [err, res] = await tryit(ordx.getNsName)({
      name: selectName,
      network,
    });
    setLoading(false);
    if (!err) {
      setCheckStatus(true);
      const { kvs = [] } = res.data || {};
      console.log('_id ', inscriptionId);
      const _id = kvs?.find((kv) => kv.key === 'ord_index')?.value;
      const avatar = kvs.find((kv) => kv.key === 'avatar')?.value || '';
      const userName =
        kvs.find((kv) => kv.key === 'personal_name')?.value || name;
      const desc = kvs.find((kv) => kv.key === 'personal_desc')?.value || '';
      const twitter_link =
        kvs.find((kv) => kv.key === 'personal_twitter')?.value || '';
      const website_link =
        kvs.find((kv) => kv.key === 'personal_website')?.value || '';
      const email_link =
        kvs.find((kv) => kv.key === 'personal_email')?.value || '';
      const fb_link =
        kvs.find((kv) => kv.key === 'personal_facebook')?.value || '';
      const template_blog =
        kvs.find((kv) => kv.key === 'template_blog')?.value || '';
      setPrevInscriptionId(_id);
      setNsData(res.data);
      setPersonal('avatar', avatar);
      setPersonal('name', userName);
      setPersonal('desc', desc);
      setPersonal('website', website_link);
      setPersonal('email', email_link);
      setPersonal('twitter', twitter_link);
      setPersonal('facebook', fb_link);
      setTemplateInscriptionId(template_blog);
      setOriginPersonalInfo({
        avatar,
        name: userName,
        desc,
        website: website_link,
        email: email_link,
        facebook: fb_link,
        twitter: twitter_link,
      });
    }
  };
  const hasRoute = useMemo(() => {
    return !!nsData?.kvs?.find((kv) => kv.key === 'ord_handle')?.inscriptionId;
  }, [nsData]);

  const handlerChange = (name: string) => {
    if (name !== selectName) {
      reset();
      setNsData({});
      setOriginPersonalInfo({});
      setTemplateInscriptionId('');
      setPrevInscriptionId('');
    }
    setSelectName(name);
  };
  const mintRoutingDisabled = useMemo(() => {
    return !templateInscriptionId;
  }, [templateInscriptionId]);
  const publishDisabled = useMemo(() => {
    return !(content && selectName && templateInscriptionId);
  }, [content, selectName, templateInscriptionId]);

  const getInscriptionScr = (id) => {
    return network === 'testnet'
      ? `https://ord-testnet4.sat20.org/content/${id}`
      : `https://ordinals.com/content/${id}`;
  };
  const toRoutingInscribe = () => {
    window.open(getInscriptionScr(templateInscriptionId), '_blank');
  };
  const personalMintDisabled = useMemo(() => {
    return !personalInfo.avatar;
  }, [personalInfo]);
  const userInfoChange = (d) => {
    setPersonal('avatar', d.avatar);
    setPersonal('name', d.name);
    setPersonal('desc', d.desc);
    setPersonal('twitter', d.twitter);
    setPersonal('website', d.website);
    setPersonal('email', d.email);
    setPersonal('facebook', d.facebook);
  };
  useEffect(() => {
    if (selectName) {
      checkHandler();
    }
  }, [selectName]);

  return (
    <div className="p-4 max-w-[80rem] mx-auto">
      <h1 className="text-center mb-4 text-xl">{t('pages.blog.title')}</h1>
      <div className="mb-4">
        <h2 className="mb-2">{t('pages.blog.step_1')} </h2>
        <BlogNameSelect onChange={handlerChange} loading={loading} />
      </div>
      {checkStatus && (
        <>
          <div className="mb-4">
            <h2 className="mb-2">
              {t('pages.blog.step_2')}
              <a
                target="_blank"
                className="text-blue-700"
                href={getInscriptionScr(defaultTemplateInscriptionId)}
              >
                ({defaultTemplateInscriptionId})
              </a>
            </h2>
            <div className="flex justify-center">
              <Button
                color="default"  
                className='w-full sm:w-40 btn-gradient'
                // isDisabled={!!templateInscriptionId}
                onClick={() => {
                  mintTemplate();
                }}
              >
                Inscribe Template
              </Button>
            </div>
          </div>
          <div className="mb-4">
            <div className="mb-2">
              <h2 className="mb-2">{t('pages.blog.step_3')} </h2>
              <div>
                <Input
                  value={templateInscriptionId}
                  onChange={(e) => setTemplateInscriptionId(e.target.value)}
                ></Input>
              </div>
            </div>
            {/* <div className="mb-2">
              <h2 className="mb-2">Attr</h2>
              <div className='flex items-center'>
                <Input
                  value={templateInscriptionId}
                  onChange={(e) => setTemplateInscriptionId(e.target.value)}
                ></Input>
              </div>
            </div> */}
            <div className="flex justify-center gap-4">
              <Button
                color="primary"
                // isDisabled={!!templateInscriptionId}
                onClick={() => {
                  toRoutingInscribe();
                }}
              >
                查看Routing铭文
              </Button>
              <Button
                color="default" 
                className='w-full sm:w-40 btn-gradient'
                isDisabled={mintRoutingDisabled}
                onClick={() => {
                  mintRouting();
                }}
              >
                Inscribe Routing
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              color="default"
              variant="light"
              className="w-full sm:w-40 btn-gradient"
              isDisabled={mintRoutingDisabled}
              onClick={() => {
                preview();
              }}
            >
              预览: {previewUrl}
            </Button>
          </div>
          <div className="mb-4">
            <div className="mb-4">
              <h2 className="mb-2">{t('pages.blog.step_4')} </h2>
              <BlogUserInfo info={personalInfo} onChange={userInfoChange} />
            </div>
            <div className="flex justify-center">
              <Button
                color="default"
                className='w-full sm:w-40 btn-gradient'
                isLoading={checkAvatarLoading}
                isDisabled={personalMintDisabled}
                onClick={() => {
                  mintPersonal();
                }}
              >
                Inscribe Info
              </Button>
            </div>
          </div>
          <div className="mb-4">
            <div className="mb-4">
              <h2 className="mb-2">{t('pages.blog.step_5')} </h2>
              <Textarea
                disableAnimation
                disableAutosize
                classNames={{
                  input: 'resize-y min-h-[140px]',
                }}
                placeholder="Enter your content here..."
                value={content}
                onValueChange={(e) => setContent(e)}
              />
            </div>
            <div className="flex justify-center">
              <Button
                color="default"
                className='w-full sm:w-40 btn-gradient'
                isDisabled={publishDisabled}
                onClick={() => {
                  publishHandler();
                }}
              >
                Publish
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
