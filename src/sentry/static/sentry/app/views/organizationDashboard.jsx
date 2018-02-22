import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Reflux from 'reflux';
import {Link} from 'react-router';
import {Sparklines, SparklinesLine} from 'react-sparklines';

import ApiMixin from '../mixins/apiMixin';
import {loadStats} from '../actionCreators/projects';

import GroupStore from '../stores/groupStore';
import HookStore from '../stores/hookStore';
import ProjectStore from '../stores/projectsStore';
import TeamStore from '../stores/teamStore';

import ActivityFeed from '../components/activity/feed';
import EventsPerHour from '../components/events/eventsPerHour';
import IssueList from '../components/issueList';
import OrganizationHomeContainer from '../components/organizations/homeContainer';
import OrganizationState from '../mixins/organizationState';

import {t, tct} from '../locale';
import {sortArray} from '../utils';

class AssignedIssues extends React.Component {
  static propTypes = {
    statsPeriod: PropTypes.string,
    pageSize: PropTypes.number,
  };

  getEndpoint = () => {
    return `/organizations/${this.props.params.orgId}/members/me/issues/assigned/?`;
  };

  getViewMoreLink = () => {
    return `/organizations/${this.props.params.orgId}/issues/assigned/`;
  };

  renderEmpty = () => {
    return <div className="box empty">{t('No issues have been assigned to you.')}</div>;
  };

  refresh = () => {
    this.refs.issueList.remountComponent();
  };

  render() {
    return (
      <div>
        <div className="pull-right">
          <Link className="btn btn-sm btn-default" to={this.getViewMoreLink()}>
            {t('View more')}
          </Link>
          <a
            className="btn btn-sm btn-default"
            style={{marginLeft: 5}}
            onClick={this.refresh}
          >
            <span className="icon icon-refresh" />
          </a>
        </div>
        <h4>Assigned to me</h4>
        <IssueList
          endpoint={this.getEndpoint()}
          query={{
            statsPeriod: this.props.statsPeriod,
            per_page: this.props.pageSize,
            status: 'unresolved',
          }}
          pagination={false}
          renderEmpty={this.renderEmpty}
          ref="issueList"
          {...this.props}
        />
      </div>
    );
  }
}

class NewIssues extends React.Component {
  static propTypes = {
    statsPeriod: PropTypes.string,
    pageSize: PropTypes.number,
  };

  getEndpoint = () => {
    return `/organizations/${this.props.params.orgId}/issues/new/`;
  };

  renderEmpty = () => {
    return (
      <div className="box empty">
        {t('No new issues have been seen in the last week.')}
      </div>
    );
  };

  refresh = () => {
    this.refs.issueList.remountComponent();
  };

  render() {
    return (
      <div>
        <div className="pull-right">
          <a
            className="btn btn-sm btn-default"
            style={{marginLeft: 5}}
            onClick={this.refresh}
          >
            <span className="icon icon-refresh" />
          </a>
        </div>
        <h4>New this week</h4>
        <IssueList
          endpoint={this.getEndpoint()}
          query={{
            statsPeriod: this.props.statsPeriod,
            per_page: this.props.pageSize,
            status: 'unresolved',
          }}
          pagination={false}
          renderEmpty={this.renderEmpty}
          ref="issueList"
          {...this.props}
        />
      </div>
    );
  }
}

function ProjectSparkline(props) {
  let values = props.data.map(tuple => tuple[1]);

  return (
    <Sparklines data={values} width={100} height={32}>
      <SparklinesLine
        {...props}
        style={{stroke: '#8f85d4', fill: 'none', strokeWidth: 3}}
      />
    </Sparklines>
  );
}
ProjectSparkline.propTypes = {
  data: PropTypes.array.isRequired,
};

const ProjectListOld = createReactClass({
  displayName: 'ProjectList',

  propTypes: {
    teams: PropTypes.array,
    maxProjects: PropTypes.number,
  },

  mixins: [OrganizationState],

  getDefaultProps() {
    return {
      maxProjects: 8,
    };
  },

  render() {
    let org = this.getOrganization();
    let {maxProjects} = this.props;
    let projects = [];
    this.props.teams.forEach(team => {
      if (team.isMember) {
        team.projects.forEach(project => {
          projects.push({...project, teamName: team.name});
        });
      }
    });

    projects = sortArray(projects, item => {
      return [!item.isBookmarked, item.teamName, item.name];
    });

    // project list is
    // a) all bookmarked projects
    // b) if bookmarked projcets < maxProjects, then fill with sorted projects until maxProjects

    let bookmarkedProjects = projects.filter(p => p.isBookmarked);
    if (bookmarkedProjects.length < maxProjects) {
      projects = bookmarkedProjects.concat(
        projects.slice(bookmarkedProjects.length, maxProjects)
      );
    } else {
      projects = bookmarkedProjects;
    }

    return (
      <div className="organization-dashboard-projects">
        <Link className="btn-sidebar-header" to={`/organizations/${org.slug}/teams/`}>
          {t('View All')}
        </Link>
        <h6 className="nav-header">{t('Projects')}</h6>
        {bookmarkedProjects.length === 0 && (
          <div className="alert alert-info" style={{marginBottom: 10}}>
            {tct('Bookmark your most used [projects:projects] to have them appear here', {
              projects: <Link to={`/organizations/${org.slug}/teams/`} />,
            })}
          </div>
        )}
        <ul className="nav nav-stacked">
          {projects.map(project => {
            return (
              <li key={project.id}>
                <div className="pull-right sparkline">
                  {project.stats && <ProjectSparkline data={project.stats} />}
                </div>
                <Link to={`/${org.slug}/${project.slug}/`}>
                  <h4>
                    {project.isBookmarked && (
                      <span className="bookmark icon-star-solid" />
                    )}
                    {project.name}
                  </h4>
                  <h5>{project.teamName}</h5>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
});

export const ProjectList = createReactClass({
  displayName: 'ProjectList',

  propTypes: {
    projects: PropTypes.array,
    maxProjects: PropTypes.number,
  },

  mixins: [OrganizationState],

  getDefaultProps() {
    return {
      maxProjects: 8,
    };
  },

  render() {
    let org = this.getOrganization();
    let {maxProjects} = this.props;

    let projects = this.props.projects.filter(p => {
      return p.isMember;
    });
    projects = sortArray(projects, item => {
      return [!item.isBookmarked, item.name];
    });

    // project list is
    // a) all bookmarked projects
    // b) if bookmarked projcets < maxProjects, then fill with sorted projects until maxProjects

    let bookmarkedProjects = projects.filter(p => p.isBookmarked);
    if (bookmarkedProjects.length < maxProjects) {
      projects = bookmarkedProjects.concat(
        projects.slice(bookmarkedProjects.length, maxProjects)
      );
    } else {
      projects = bookmarkedProjects;
    }

    return (
      <div className="organization-dashboard-projects">
        <Link className="btn-sidebar-header" to={`/organizations/${org.slug}/teams/`}>
          {t('View All')}
        </Link>
        <h6 className="nav-header">{t('Projects')}</h6>
        {bookmarkedProjects.length === 0 && (
          <div className="alert alert-info" style={{marginBottom: 10}}>
            {tct('Bookmark your most used [projects:projects] to have them appear here', {
              projects: <Link to={`/organizations/${org.slug}/teams/`} />,
            })}
          </div>
        )}
        <ul className="nav nav-stacked">
          {projects.map(project => {
            return (
              <li key={project.id} style={{clear: 'both'}}>
                <div className="pull-right sparkline">
                  {project.stats && <ProjectSparkline data={project.stats} />}
                </div>
                <Link to={`/${org.slug}/${project.slug}/`}>
                  <h4 style={{margin: '25px 0px'}}>
                    {project.isBookmarked && (
                      <span className="bookmark icon-star-solid" />
                    )}
                    {project.slug}
                  </h4>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
});

class Activity extends React.Component {
  getEndpoint = () => {
    return `/organizations/${this.props.params.orgId}/activity/`;
  };

  refresh = () => {
    this.refs.activityFeed.remountComponent();
  };

  render() {
    return (
      <div>
        <div className="pull-right">
          <a
            className="btn btn-sm btn-default"
            style={{marginLeft: 5}}
            onClick={this.refresh}
          >
            <span className="icon icon-refresh" />
          </a>
        </div>
        <h4>{t('Recent activity')}</h4>
        <ActivityFeed
          ref="activityFeed"
          endpoint={this.getEndpoint()}
          query={{
            per_page: 10,
          }}
          pagination={false}
          {...this.props}
        />
      </div>
    );
  }
}

const OrganizationDashboard = createReactClass({
  displayName: 'OrganizationDashboard',
  mixins: [
    ApiMixin,
    Reflux.listenTo(TeamStore, 'onTeamListChange'),
    Reflux.listenTo(ProjectStore, 'onProjectListChange'),
    OrganizationState,
  ],

  getDefaultProps() {
    return {
      statsPeriod: '24h',
      pageSize: 5,
    };
  },

  getInitialState() {
    // Allow injection via getsentry et all
    let hooks = HookStore.get('organization:dashboard:secondary-column').map(cb => {
      return cb({
        params: this.props.params,
      });
    });

    return {
      teams: TeamStore.getAll(),
      projects: ProjectStore.getAll(),
      hooks,
    };
  },

  componentWillMount() {
    loadStats(this.api, {
      orgId: this.props.params.orgId,
      query: {
        since: new Date().getTime() / 1000 - 3600 * 24,
        stat: 'generated',
        group: 'project',
      },
    });
  },

  componentWillUnmount() {
    GroupStore.reset();
  },

  onTeamListChange() {
    this.setState({
      teams: TeamStore.getAll(),
    });
  },

  onProjectListChange() {
    this.setState({
      projects: ProjectStore.getAll(),
    });
  },

  render() {
    let org = this.getOrganization();
    let features = new Set(org.features);

    return (
      <OrganizationHomeContainer>
        <div className="row">
          <div className="col-md-8">
            <AssignedIssues {...this.props} />
            <NewIssues {...this.props} />
            <Activity {...this.props} />
          </div>
          <div className="col-md-4">
            {this.state.hooks}
            <EventsPerHour {...this.props} />
            {features.has('internal-catchall') ? (
              <ProjectList {...this.props} projects={this.state.projects} />
            ) : (
              <ProjectListOld {...this.props} teams={this.state.teams} />
            )}
          </div>
        </div>
      </OrganizationHomeContainer>
    );
  },
});

export default OrganizationDashboard;
