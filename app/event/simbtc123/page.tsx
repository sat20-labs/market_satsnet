/* eslint-disable react/no-unescaped-entities */
'use client';
import { Button } from '@nextui-org/react';
import {
  bindTwitterAccount,
  updateTwitterActivity,
  getTwitterActivity,
  getTwitterAccount,
} from '@/api';
import { useEffect, useMemo, useState } from 'react';
import { tryit } from 'radash';
import { notification } from 'antd';
import { useSearchParams } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';

export default function BtcNameEvent() {
  const params = useSearchParams();
  const { i18n, t } = useTranslation();
  const paramId = params.get('id') || 1;
  // const activity_id = 1;
  const { address } = useReactWalletStore();
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [retweetLoading, setRetweetLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [activityResult, setActivityResult] = useState<any>({});
  const [acountResult, setAccountResult] = useState<any>({});

  const previewData = useMemo(() => {
    if (i18n.language === 'en') {
      return [
        {
          activity_id: 1,
          title: '🔥 Randomly Select 1,000 Winners for $RarePizza Airdrop!',
          time: '2024/10/1 ~ 2024/10/7',
          desc: 'Complete the task to qualify for a lucky draw, where 1,000 winners will be randomly selected! The list of winners will be announced on Twitter after the event ends. Each winning participant will receive 100 $RarePizza airdropped once the SAT20 protocol L2 (Lighting Channel + SatoshiNet) officially launches. Don’t miss out—act fast for a chance to win!',
          twitter_id: 'SimBtc123',
          tweet_id: '1838568142236455423',
        },
      ];
    } else {
      return [
        {
          activity_id: 1,
          title: '🔥 随机抽 1000 名幸运者，赢 $RarePizza 空投！',
          time: '2024/10/1 ~ 2024/10/7',
          desc: '完成任务即有机会参与抽奖，1000 名幸运儿将随机抽出！活动结束后，我们将在推特公布中奖名单。中奖用户将在 SAT20 协议 L2（Lighting Channel + SatoshiNet）正式上线后，获得 100 个 $RarePizza 空投！机会有限，快来拼手速赢取空投吧！',
          twitter_id: 'SimBtc123',
          tweet_id: '1838568142236455423',
        },
      ];
    }
  }, [i18n.language]);
  const currentData = useMemo(() => {
    return previewData.find((item) => item.activity_id == paramId);
  }, [paramId, previewData]);
  const bindTwitter = async () => {
    const [_, res] = await tryit(bindTwitterAccount)({ address });
    if (res.code === 200) {
      location.href = res.data.authorization_url;
    }
  };
  const getTwitter = async () => {
    setLoading(true);
    setAccountResult(false);
    const [err, res] = await tryit(getTwitterAccount)({ address });
    setLoading(false);
    if (err) {
      console.error(err);
      return;
    }
    if (res.code === 200) {
      setAccountResult(res.data?.twitter || {});
    }
  };
  const getFollowStatus = async () => {
    setLoading(true);
    setActivityResult({});
    const [err, res] = await tryit(getTwitterActivity)({
      address,
      activity_id: currentData?.activity_id,
    });
    setLoading(false);
    if (err) {
      console.error(err);
    }
    if (res.code === 200) {
      setActivityResult(res.data);
    }
  };

  useEffect(() => {
    if (address) {
      getTwitter();
      getFollowStatus();
    }
  }, [address]);
  const followHandler = async () => {
    window.open(
      `https://twitter.com/intent/follow?screen_name=${currentData?.twitter_id}`,
      '_blank',
    );
    const [err, res] = await tryit(updateTwitterActivity)({
      address,
      activity_name: 'following',
      result: 1,
      activity_id: currentData?.activity_id,
    });
    if (err) {
      console.error(err);
      return;
    }
    if (res.code === 200) {
      setActivityResult({
        ...activityResult,
        following: 1,
      });
    }
  };
  const shareHandler = async () => {
    window.open(
      `https://twitter.com/intent/retweet?tweet_id=${currentData?.tweet_id}`,
      '_blank',
    );
    const [err, res] = await tryit(updateTwitterActivity)({
      address,
      activity_name: 'retweets',
      activity_id: currentData?.activity_id,
      result: 1,
    });
    if (err) {
      console.error(err);
      return;
    }
    if (res.code === 200) {
      setActivityResult({
        ...activityResult,
        retweets: 1,
      });
    }
  };
  const likeHandler = async () => {
    window.open(
      'https://twitter.com/intent/like?tweet_id=${currentData?.tweet_id}',
      '_blank',
    );
    const [err, res] = await tryit(updateTwitterActivity)({
      address,
      activity_name: 'flowers',
      activity_id: currentData?.activity_id,
      result: 1,
    });
    if (err) {
      console.error(err);
      return;
    }
    if (res.code === 200) {
      setActivityResult({
        ...activityResult,
        flowers: 1,
      });
    }
  };

  const verifyActivity = async () => {
    const [err, res] = await tryit(getTwitterActivity)({
      address,
      activity_id: currentData?.activity_id,
    });
    setLoading(false);
    const finished =
      res?.following == 1 && res?.retweets == 1 && res?.flowers == 1;
    if (err || res?.code !== 200 || !finished) {
      notification.error({
        message: t('pages.event.totast.error'),
      });
    } else {
      notification.success({
        message: t('pages.event.totast.success'),
      });
    }
  };
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="md:text-3xl font-bold mb-4">{currentData?.title}</h1>
        <p className="text-sm">Time:{currentData?.time}</p>
      </div>
      <div className="mb-6">
        <h2 className="md:text-2xl font-bold mb-4">
          Step-by-step Task Completion
        </h2>
        <div className="border border-gray-700 rounded-lg p-4">
          {currentData?.desc}
        </div>
      </div>
      <div className="mb-6">
        <div className="md:text-2xl font-bold mb-4 flex justify-between items-center">
          <span>Complete Follow, Like, and Retweet</span>

          <Button
            size="sm"
            color="default"
            radius="full"
            isLoading={loading}
            isDisabled={acountResult?.id}
            onClick={bindTwitter}
          >
            {acountResult?.id
              ? `Bound successfully ${acountResult.name}`
              : 'Bind X'}
          </Button>
        </div>
        <div className="mb-4 border border-gray-700 rounded-lg p-4">
          <div className="mb-4">
            Follow @{currentData?.twitter_id} on X (formerly Twitter)
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={followHandler}
              size="sm"
              isLoading={loading || followLoading}
              isDisabled={activityResult.following === 1 || !acountResult?.id}
              color="default"
              radius="full"
            >
              Follow
            </Button>
            {/* <Button size="sm" color="default" radius="full">
              验证
            </Button> */}
          </div>
        </div>
        <div className="mb-4 border border-gray-700 rounded-lg p-4">
          <div className="mb-4">Retweet @{currentData?.twitter_id} 's post</div>
          <div className="flex items-center gap-4">
            <Button
              onClick={shareHandler}
              size="sm"
              color="default"
              isLoading={loading || retweetLoading}
              isDisabled={activityResult.retweets === 1 || !acountResult?.id}
              radius="full"
            >
              Retweet
            </Button>
            {/* <Button size="sm" color="default" radius="full">
              验证
            </Button> */}
          </div>
        </div>
        <div className="mb-4 border border-gray-700 rounded-lg p-4">
          <div className="mb-4">Like @{currentData?.twitter_id} 's post</div>
          <div className="flex items-center gap-4">
            <Button
              onClick={likeHandler}
              size="sm"
              color="default"
              isLoading={loading || likeLoading}
              isDisabled={activityResult.flowers === 1 || !acountResult?.id}
              radius="full"
            >
              Like
            </Button>
            {/* <Button size="sm" color="default" radius="full">
              验证
            </Button> */}
          </div>
        </div>
        <div className="flex justify-center">
          <Button
            size="md"
            color="primary"
            radius="full"
            onClick={verifyActivity}
          >
            Verify Eligibility
          </Button>
        </div>
      </div>
    </div>
  );
}
