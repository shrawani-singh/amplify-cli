import { nspawn as spawn, getCLIPath, singleSelect } from '..';
import { ExecutionContext } from '../utils';

type AmplifyConfiguration = {
  accessKeyId: string;
  secretAccessKey: string;
  profileName?: string;
  region?: string;
};

const defaultSettings = {
  profileName: 'amplify-integ-test-user',
  region: 'us-east-2',
  userName: '\r',
};

const regionOptions = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
];

const profileOptions = ['cancel', 'update', 'remove'];

const MANDATORY_PARAMS = ['accessKeyId', 'secretAccessKey', 'region'];

export function amplifyConfigure(settings: AmplifyConfiguration): Promise<void> {
  const s = { ...defaultSettings, ...settings };
  const missingParam = MANDATORY_PARAMS.filter(p => !Object.keys(s).includes(p));
  if (missingParam.length) {
    throw new Error(`mandatory params ${missingParam.join(' ')} are missing`);
  }

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['configure'], { stripColors: true })
      .wait('Sign in to your AWS administrator account:')
      .wait('Press Enter to continue')
      .sendCarriageReturn()
      .wait('Specify the AWS Region');

    singleSelect(chain, s.region, regionOptions);

    chain
      .wait('user name:')
      .sendCarriageReturn()
      .wait('Press Enter to continue')
      .sendCarriageReturn()
      .wait('accessKeyId')
      .pauseRecording()
      .sendLine(s.accessKeyId)
      .wait('secretAccessKey')
      .sendLine(s.secretAccessKey)
      .resumeRecording()
      .wait('Profile Name:')
      .sendLine(s.profileName)
      .wait('Successfully set up the new user.')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function amplifyConfigureProject(settings: { cwd: string; enableContainers: boolean }): Promise<void> {
  const { enableContainers = false, cwd } = settings;

  const confirmContainers: keyof Pick<ExecutionContext, 'sendConfirmYes' | 'sendConfirmNo'> = enableContainers
    ? 'sendConfirmYes'
    : 'sendConfirmNo';

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['configure', 'project'], { cwd, stripColors: true })
      .wait('Enter a name for the project')
      .sendCarriageReturn()
      .wait('Choose your default editor:')
      .sendCarriageReturn()
      .wait("Choose the type of app that you're building")
      .sendCarriageReturn()
      .wait('What javascript framework are you using')
      .sendCarriageReturn()
      .wait('Source Directory Path:')
      .sendCarriageReturn()
      .wait('Distribution Directory Path:')
      .sendCarriageReturn()
      .wait('Build Command:')
      .sendCarriageReturn()
      .wait('Start Command:')
      .sendCarriageReturn()
      .wait('Do you want to enable container-based deployments?')
      [confirmContainers]()
      .wait('Do you want to update or remove the project level AWS profile?');

    singleSelect(chain, profileOptions[0], profileOptions);

    chain.wait('Successfully made configuration changes to your project.').run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}
