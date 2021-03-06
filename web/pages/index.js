import 'isomorphic-unfetch';
import React from 'react';
import Link from 'next/link';
import Router from 'next/router';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga'
import classNames from 'classnames';
import Head from '../components/head';
import Header from '../components/header';
import Sidebar from '../components/sidebar';
import Icon from '../components/icon';
import Spinner from '../components/spinner';

const Editor = dynamic(import('../components/editor'), { ssr: false });

const STABLE_URL = 'https://black-api-stable.now.sh';
const MASTER_URL = 'https://black-api-master.now.sh';

async function getVersion(url) {
  let res = await (await fetch(`${url}/version`)).json();
  return res.version;
}

export default class extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      isSidebarVisible: false,
      source: props.source,
      formatted: props.formatted,
      options: props.options,
      version: props.version,
      versions: props.versions,
      state: props.state,
      issueLink: props.issueLink
    };
  }

  static async getInitialProps({ query }) {
    let masterVersion;
    let stableVersion;
    let currentVersion = query.version || 'stable';
    let url = currentVersion === 'master' ? MASTER_URL : STABLE_URL;

    let json = await (await fetch(
      `${url}${query.state ? `?state=${query.state}` : ''}`
    )).json();

    if (currentVersion === 'master') {
      masterVersion = json.version;
      stableVersion = await getVersion(STABLE_URL);
    } else {
      stableVersion = json.version;
      masterVersion = await getVersion(MASTER_URL);
    }

    return {
      source: json.source_code,
      formatted: json.formatted_code,
      options: json.options,
      state: json.state,
      issueLink: json.issue_link,
      version: currentVersion,
      versions: {
        stable: stableVersion,
        master: masterVersion
      }
    };
  }

  componentDidMount() {
    this.updateStateParam();
    ReactGA.initialize('UA-37217294-8');
    ReactGA.set({ anonymizeIp: true });
    ReactGA.pageview(window.location.pathname);
  }

  updateStateParam() {
    let href = `/?version=${this.state.version}&state=${this.state.state}`;
    Router.replace(href, href, { shallow: true });
  }

  handleToggleSidebar = () => {
    this.setState((prevState) => ({
      isSidebarVisible: !prevState.isSidebarVisible
    }));
  };

  handleSourceUpdate = (value) => {
    this.setState(() => ({
      source: value
    }));
  };

  handleOptionsUpdate = (value) => {
    this.setState((prevState) => {
      if (value.version) {
        return { version: value.version };
      }

      return {
        options: Object.assign({}, prevState.options, value)
      };
    });
  };

  handleSubmit = async () => {
    this.setState(() => ({ isLoading: true }));

    let res = await fetch(
      this.state.version === 'stable' ? STABLE_URL : MASTER_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: this.state.source,
          options: this.state.options
        })
      }
    );

    let json = await res.json();

    this.setState(() => ({
      isLoading: false,
      source: json.source_code,
      formatted: json.formatted_code,
      options: json.options,
      state: json.state,
      issueLink: json.issue_link
    }));

    this.updateStateParam();
  };

  render() {
    let currentVersion = this.state.versions[this.state.version];

    if (this.state.version === 'stable') {
      currentVersion = `v${currentVersion}`;
    } else {
      currentVersion = `@${currentVersion}`;
    }

    return (
      <div>
        <Head title="Black Playground" />
        <div className="flex flex-col h-screen">
          <Header version={currentVersion} />

          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 min-h-0">
              <Sidebar
                version={this.state.version}
                versions={this.state.versions}
                options={this.state.options}
                visible={this.state.isSidebarVisible}
                onChange={this.handleOptionsUpdate}
              />

              <div className="flex flex-1">
                <div className="flex flex-1 relative">
                  <Editor
                    value={this.state.source}
                    onChange={this.handleSourceUpdate}
                  />
                </div>
                <div className="flex flex-1 relative">
                  {this.state.isLoading ? (
                    <div className="flex items-center justify-center w-full ace-tomorrow-night">
                      <Spinner />
                    </div>
                  ) : (
                    <Editor value={this.state.formatted} readOnly={true} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between content-center items-center p-4">
              <div className="flex text-right">
                <Link href={this.state.issueLink}>
                  <a className="bg-transparent text-sm text-black font-bold py-2 px-4 no-underline hover:underline">
                    Report issue
                  </a>
                </Link>
              </div>
              <div className="flex text-right">
                <button
                  className={classNames(
                    'hover:bg-black text-sm hover:text-white font-bold p-2 border-2 border-black rounded inline-flex items-center',
                    {
                      'bg-black': this.state.isSidebarVisible,
                      'text-white': this.state.isSidebarVisible,
                      'text-black': !this.state.isSidebarVisible,
                      'bg-transparent': !this.state.isSidebarVisible
                    }
                  )}
                  onClick={this.handleToggleSidebar}>
                  <Icon icon="cog" />
                </button>

                <button
                  className={classNames("bg-transparent hover:bg-black text-black hover:text-white font-bold ml-2 py-2 px-4 border-2 border-black rounded", {
                    'opacity-50': this.state.isLoading,
                    'cursor-not-allowed': this.state.isLoading
                  })}
                  onClick={this.handleSubmit}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
