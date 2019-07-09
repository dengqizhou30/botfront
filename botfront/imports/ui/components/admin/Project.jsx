import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import {
    Container, Segment, Header, Button, Confirm, Message,
} from 'semantic-ui-react';
import AutoForm from 'uniforms-semantic/AutoForm';
import React from 'react';
import 'react-s-alert/dist/s-alert-default.css';
import { browserHistory } from 'react-router';
import { AutoField, ErrorsField, SubmitField } from 'uniforms-semantic';
import InfoField from '../utils/InfoField';
import { Projects } from '../../../api/project/project.collection';
import { wrapMeteorCallback } from '../utils/Errors';
import { PageMenu } from '../utils/Utils';
import Can from '../roles/Can';
import SelectField from '../nlu/common/SelectLanguage';

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = { confirmOpen: false };
    }

    methodCallback = () => wrapMeteorCallback((err) => {
        if (!err) browserHistory.goBack();
    });

    updateProject = (project) => {
        if (project._id) {
            Meteor.call('project.update', project, this.methodCallback());
        } else {
            Meteor.call('project.insert', project, wrapMeteorCallback((err, result) => {
                if (!err) {
                    Meteor.callWithPromise(
                        'nlu.insert',
                        {
                            name: 'Default Model',
                            language: project.defaultLanguage,
                            published: true,
                        },
                        result,
                    );
                    browserHistory.goBack();
                }
            }));
        }
    };

    deleteProject = () => {
        const { project } = this.props;
        Meteor.call('project.delete', project._id, this.methodCallback());
    };

    render() {
        const { project, loading } = this.props;
        const { confirmOpen } = this.state;
        const { namespace } = project || {};
        const projectsSchema = Projects.simpleSchema();
        return (
            <>
                <PageMenu icon='sitemap' title={project._id ? project.name : 'New project'} />
                <Container>
                    {!loading && (
                        <Segment>
                            <AutoForm
                                schema={projectsSchema}
                                onSubmit={p => this.updateProject(p)}
                                model={project}
                            >
                                <AutoField name='name' />
                                {projectsSchema.allowsKey('namespace') && (
                                    <InfoField
                                        name='namespace'
                                        label='Namespace'
                                        info='The namespace to be used for Kubernetes and Google Cloud. Must be composed of only lower case letters, dashes, and underscores.'
                                        disabled={!!namespace}
                                    />
                                )}
                                <SelectField name='defaultLanguage' label={null} placeholder='Select the default language of your project' />
                                <br />
                                {projectsSchema.allowsKey('apiKey') && (
                                    <InfoField name='apiKey' label='API key' info='Botfront API key' />
                                )}
                                <AutoField name='disabled' />
                                <ErrorsField />
                                <SubmitField />
                            </AutoForm>
                        </Segment>
                    )}
                    {!loading && project._id && (
                        <Can I='global-admin'>
                            <Segment>
                                <Header content='Delete project' />
                                {!project.disabled && <Message info content='A project must be disabled to be deletable' />}
                                <br />
                                <Button icon='trash' disabled={!project.disabled} negative content='Delete project' onClick={() => this.setState({ confirmOpen: true })} />
                                <Confirm
                                    open={confirmOpen}
                                    header={`Delete project ${project.name}?`}
                                    content='This cannot be undone!'
                                    onCancel={() => this.setState({ confirmOpen: false })}
                                    onConfirm={() => this.deleteProject()}
                                />
                            </Segment>
                        </Can>
                    )}
                </Container>
            </>
        );
    }
}

Project.defaultProps = {
    project: {},
};

Project.propTypes = {
    loading: PropTypes.bool.isRequired,
    project: PropTypes.object,
};

const ProjectContainer = withTracker(({ params }) => {
    let project = null;
    let loading = false;
    if (params.project_id) {
        const projectsHandle = Meteor.subscribe('projects', params.project_id);
        loading = !projectsHandle.ready();
        [project] = Projects.find(
            { _id: params.project_id },
            {
                fields: {
                    name: 1,
                    namespace: 1,
                    disabled: 1,
                    apiKey: 1,
                },
            },
        ).fetch();
    }

    return {
        loading,
        project,
    };
})(Project);

export default ProjectContainer;
